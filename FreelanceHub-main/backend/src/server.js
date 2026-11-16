import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './utils/prisma.js';
import { HttpError } from './utils/http.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import proposalRoutes from './routes/proposals.js';
import contractRoutes from './routes/contracts.js';
import communicationRoutes from './routes/communication.js';
import notificationRoutes from './routes/notifications.js';
import reviewRoutes from './routes/reviews.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import teamRoutes from './routes/teams.js';
import smartMatchRoutes from './routes/smartmatch.js';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Missing DATABASE_URL or JWT_SECRET. Copy backend/.env.example to backend/.env and configure it.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Render runs the service behind one trusted reverse proxy. Keep local defaults
// conservative while allowing the deployment platform to supply its proxy hop.
if (process.env.TRUST_PROXY) {
  const proxySetting = process.env.TRUST_PROXY.trim();
  app.set('trust proxy', proxySetting === 'true' ? true : Number(proxySetting));
}
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
const io = new SocketServer(server, { cors: { origin: allowedOrigins, credentials: true } });
app.set('io', io);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use('/api/contracts', express.raw({ type: 'application/octet-stream', limit: '20mb' }));
app.use((req, _res, next) => {
  if (req.body === undefined) {
    req.body = {};
  } else if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(new HttpError(400, 'Request body must be a JSON object.'));
  }
  next();
});
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'FreelanceHub API', timestamp: new Date().toISOString() }));
app.get('/api/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/messages', communicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/smartmatch', smartMatchRoutes);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) return next(new Error('This account is unavailable.'));
    socket.userId = user.id;
    next();
  } catch { next(new Error('Invalid session')); }
});
io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
});

app.use((_req, _res, next) => next(new HttpError(404, 'API endpoint not found.')));
app.use((error, _req, res, _next) => {
  let status = error.status || 500;
  let message = error.message;

  if (error.message === 'Not allowed by CORS') {
    status = 403;
    message = 'This origin is not allowed to access the API.';
  } else if (error.code === 'P2002') {
    status = 409;
    message = 'A record with this information already exists.';
  } else if (error.code === 'P2025') {
    status = 404;
    message = 'The requested record was not found.';
  } else if (error.code === 'P2003') {
    status = 400;
    message = 'This change conflicts with related records.';
  } else if (error.code === 'P2034') {
    status = 409;
    message = 'This record changed while the request was processing. Please retry.';
  }

  if (status >= 500) console.error(error);
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on the server.' : message,
    ...(process.env.NODE_ENV === 'development' && status >= 500 ? { detail: error.message } : {}),
  });
});

const port = Number(process.env.PORT || 5000);
server.listen(port, () => console.log(`FreelanceHub API is running on port ${port}`));

const shutdown = async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
