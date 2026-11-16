import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const items = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  const unread = items.filter((item) => !item.readAt).length;
  res.json({ items, unread });
}));
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const item = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!item || item.userId !== req.user.id) throw new HttpError(404, 'Notification not found.');
  const updated = await prisma.notification.update({ where: { id: item.id }, data: { readAt: new Date() } });
  res.json({ notification: updated });
}));
router.patch('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ message: 'All notifications marked as read.' });
}));
export default router;
