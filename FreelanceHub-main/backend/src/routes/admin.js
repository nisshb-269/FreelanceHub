import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));
router.get('/users', asyncHandler(async (req, res) => {
  const { q = '', role } = req.query;
  if (role && !['CLIENT', 'FREELANCER', 'ADMIN'].includes(String(role))) {
    throw new HttpError(400, 'Choose a valid account role.');
  }
  const search = String(q).trim().slice(0, 100);
  const items = await prisma.user.findMany({ where: { ...(role ? { role: String(role) } : {}), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}) }, select: { id: true, name: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ items });
}));
router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new HttpError(400, 'isActive must be true or false.');
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot deactivate your own administrator account.');
  const existing = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'User not found.');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: req.body.isActive }, select: { id: true, name: true, email: true, isActive: true } });
  if (!user.isActive) {
    // Revoke existing authenticated Socket.IO connections immediately when an
    // administrator suspends an account; subsequent HTTP/socket auth also fails.
    req.app.get('io')?.in(`user:${user.id}`).disconnectSockets(true);
  }
  res.json({ user });
}));
router.patch('/users/:id/verify', asyncHandler(async (req, res) => {
  if (typeof req.body.isVerified !== 'boolean') throw new HttpError(400, 'isVerified must be true or false.');
  const existing = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
  if (!existing) throw new HttpError(404, 'User not found.');
  if (existing.role !== 'FREELANCER') throw new HttpError(400, 'Only freelancer accounts can be verified.');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isVerified: req.body.isVerified }, select: { id: true, name: true, isVerified: true } });
  res.json({ user });
}));
router.get('/projects', asyncHandler(async (_req, res) => {
  const items = await prisma.project.findMany({ include: { client: { select: { id: true, name: true, email: true } }, _count: { select: { proposals: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ items });
}));
router.get('/disputes', asyncHandler(async (_req, res) => {
  const items = await prisma.dispute.findMany({ include: { openedBy: { select: { id: true, name: true } }, contract: { include: { project: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' } });
  res.json({ items });
}));
router.patch('/disputes/:id', asyncHandler(async (req, res) => {
  const item = await prisma.dispute.findUnique({ where: { id: req.params.id } });
  if (!item) throw new HttpError(404, 'Dispute not found.');
  const status = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].includes(req.body.status) ? req.body.status : null;
  if (!status) throw new HttpError(400, 'Invalid dispute status.');
  if (req.body.resolution !== undefined && req.body.resolution !== null
    && (typeof req.body.resolution !== 'string' || req.body.resolution.length > 5000)) {
    throw new HttpError(400, 'Resolution must be text containing at most 5,000 characters.');
  }
  const updated = await prisma.dispute.update({
    where: { id: item.id },
    data: { status, resolution: req.body.resolution?.trim() || null },
  });
  res.json({ dispute: updated });
}));
export default router;
