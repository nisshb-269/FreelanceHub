import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { contractId, rating, comment } = req.body;
  if (typeof contractId !== 'string' || !contractId.trim()) {
    throw new HttpError(400, 'A valid contract reference is required.');
  }
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5
    || typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1500) {
    throw new HttpError(400, 'Choose a 1–5 star rating and write a comment of at most 1,500 characters.');
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { project: true },
  });
  if (!contract || contract.status !== 'COMPLETED') {
    throw new HttpError(400, 'Reviews are available after a contract is completed.');
  }
  if (![contract.clientId, contract.freelancerId].includes(req.user.id)) {
    throw new HttpError(403, 'Only participants can review this contract.');
  }

  const revieweeId = req.user.id === contract.clientId ? contract.freelancerId : contract.clientId;
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        contractId,
        reviewerId: req.user.id,
        revieweeId,
        rating: Number(rating),
        comment: comment.trim(),
      },
    });

    await tx.notification.create({
      data: {
        userId: revieweeId,
        type: 'NEW_REVIEW',
        title: 'You received a review',
        message: `${req.user.name} left feedback for ${contract.project.title}.`,
        link: '/app/reviews',
      },
    });
    return created;
  });

  res.status(201).json({ review });
}));

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const [given, received] = await Promise.all([
    prisma.review.findMany({
      where: { reviewerId: req.user.id },
      include: {
        reviewee: { select: { id: true, name: true } },
        contract: { include: { project: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { revieweeId: req.user.id },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        contract: { include: { project: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({ given, received });
}));

export default router;
