import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();

router.get('/contacts', requireAuth, asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim();
  const items = await prisma.user.findMany({
    where: {
      id: { not: req.user.id },
      role: { in: ['CLIENT', 'FREELANCER'] },
      isActive: true,
      ...(query ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
          { freelancerProfile: { is: { headline: { contains: query, mode: 'insensitive' } } } },
        ],
      } : {}),
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      freelancerProfile: { select: { headline: true } },
    },
    orderBy: { name: 'asc' },
    take: 25,
  });
  res.json({ items });
}));

router.get('/conversations', requireAuth, asyncHandler(async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } }, receiver: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' }, take: 300,
  });
  const map = new Map();
  for (const message of messages) {
    const other = message.senderId === req.user.id ? message.receiver : message.sender;
    if (!map.has(other.id)) map.set(other.id, { user: other, lastMessage: message, unread: 0 });
    if (message.receiverId === req.user.id && !message.readAt) map.get(other.id).unread += 1;
  }
  res.json({ items: [...map.values()] });
}));

router.get('/:userId', requireAuth, asyncHandler(async (req, res) => {
  const other = await prisma.user.findFirst({ where: { id: req.params.userId, isActive: true }, select: { id: true, name: true, avatarUrl: true, role: true } });
  if (!other) throw new HttpError(404, 'User not found.');
  const items = await prisma.message.findMany({ where: { OR: [{ senderId: req.user.id, receiverId: other.id }, { senderId: other.id, receiverId: req.user.id }] }, include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
  await prisma.message.updateMany({ where: { senderId: other.id, receiverId: req.user.id, readAt: null }, data: { readAt: new Date() } });
  res.json({ user: other, items });
}));

router.post('/:userId', requireAuth, asyncHandler(async (req, res) => {
  const { content, contractId } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) {
    throw new HttpError(400, 'Message must contain text.');
  }
  const normalizedContent = content.trim();
  if (normalizedContent.length > 4000) {
    throw new HttpError(400, 'Messages cannot exceed 4,000 characters.');
  }
  if (contractId !== undefined && contractId !== null && (typeof contractId !== 'string' || !contractId.trim())) {
    throw new HttpError(400, 'Contract reference must be valid.');
  }
  if (req.params.userId === req.user.id) throw new HttpError(400, 'You cannot message yourself.');

  const receiver = await prisma.user.findFirst({ where: { id: req.params.userId, isActive: true } });
  if (!receiver) throw new HttpError(404, 'Recipient not found.');

  if (contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || ![contract.clientId, contract.freelancerId].includes(req.user.id) || ![contract.clientId, contract.freelancerId].includes(receiver.id)) {
      throw new HttpError(403, 'This contract is not available to these users.');
    }
  }

  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        senderId: req.user.id,
        receiverId: receiver.id,
        content: normalizedContent,
        contractId: contractId || null,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    await tx.notification.create({
      data: {
        userId: receiver.id,
        type: 'NEW_MESSAGE',
        title: 'New message',
        message: `${req.user.name} sent you a message.`,
        link: `/app/messages/${req.user.id}`,
      },
    });

    return createdMessage;
  });

  req.app.get('io')?.to(`user:${receiver.id}`).emit('message:new', message);
  res.status(201).json({ message });
}));

export default router;
