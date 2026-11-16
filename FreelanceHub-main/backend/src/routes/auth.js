import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { asyncHandler, HttpError, cleanUser } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeEmail, isValidPassword } from '../utils/validation.js';

const router = Router();
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || !normalizedEmail) {
    throw new HttpError(400, 'Enter a name (up to 80 characters) and a valid email address.');
  }
  if (!isValidPassword(password)) {
    throw new HttpError(400, 'Password must contain 8–72 UTF-8 bytes.');
  }
  if (!['CLIENT', 'FREELANCER'].includes(role)) {
    throw new HttpError(400, 'Choose Client or Freelancer as your account type.');
  }

  if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) {
    throw new HttpError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      ...(role === 'FREELANCER' ? { freelancerProfile: { create: {} } } : { clientProfile: { create: {} } }),
    },
    include: { freelancerProfile: true, clientProfile: true },
  });
  res.status(201).json({ token: tokenFor(user), user: cleanUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof password !== 'string' || !password.length || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'Enter a valid email address and password (up to 72 UTF-8 bytes).');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { freelancerProfile: true, clientProfile: true },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  if (!user.isActive) throw new HttpError(403, 'Your account has been suspended. Contact support.');
  res.json({ token: tokenFor(user), user: cleanUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { freelancerProfile: true, clientProfile: true },
  });
  const reviews = await prisma.review.aggregate({ where: { revieweeId: req.user.id }, _avg: { rating: true }, _count: { _all: true } });
  res.json({ user: { ...cleanUser(user), averageRating: reviews._avg.rating || 0, reviewCount: reviews._count._all } });
}));

export default router;
