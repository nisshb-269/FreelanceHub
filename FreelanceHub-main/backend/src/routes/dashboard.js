import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

function activitySeries(records) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleString('en-IN', { month: 'short' }), value: 0 };
  });
  const lookup = new Map(months.map((item) => [item.key, item]));
  for (const record of records) {
    const date = new Date(record.createdAt);
    const item = lookup.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (item) item.value += 1;
  }
  return months.map(({ month, value }) => ({ month, value }));
}

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

  if (req.user.role === 'ADMIN') {
    const [users, freelancers, clients, projects, openProjects, contracts, completedContracts, proposals, disputes, recentUsers] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { role: 'FREELANCER' } }), prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.project.count(), prisma.project.count({ where: { status: 'OPEN' } }), prisma.contract.count(),
      prisma.contract.count({ where: { status: 'COMPLETED' } }), prisma.proposal.count(), prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);
    return res.json({ summary: { users, freelancers, clients, projects, openProjects, contracts, completedContracts, proposals, disputes }, activity: activitySeries(recentUsers), activityLabel: 'New accounts' });
  }

  if (req.user.role === 'CLIENT') {
    const [projects, openProjects, proposals, activeContracts, completedContracts, contracts, recentProjects] = await Promise.all([
      prisma.project.count({ where: { clientId: userId } }), prisma.project.count({ where: { clientId: userId, status: 'OPEN' } }),
      prisma.proposal.count({ where: { project: { clientId: userId }, status: 'PENDING' } }),
      prisma.contract.count({ where: { clientId: userId, status: { in: ['ACTIVE', 'SUBMITTED', 'REVISION_REQUESTED'] } } }),
      prisma.contract.count({ where: { clientId: userId, status: 'COMPLETED' } }),
      prisma.contract.findMany({ where: { clientId: userId }, include: { project: true, freelancer: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }),
      prisma.project.findMany({ where: { clientId: userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);
    return res.json({ summary: { projects, openProjects, proposals, activeContracts, completedContracts }, recentContracts: contracts, activity: activitySeries(recentProjects), activityLabel: 'Projects posted' });
  }

  const [proposals, pendingProposals, activeContracts, completedContracts, savedProjects, earnings, contracts, recentContracts] = await Promise.all([
    prisma.proposal.count({ where: { freelancerId: userId } }), prisma.proposal.count({ where: { freelancerId: userId, status: 'PENDING' } }),
    prisma.contract.count({ where: { freelancerId: userId, status: { in: ['ACTIVE', 'SUBMITTED', 'REVISION_REQUESTED'] } } }),
    prisma.contract.count({ where: { freelancerId: userId, status: 'COMPLETED' } }), prisma.savedProject.count({ where: { userId } }),
    prisma.freelancerProfile.findUnique({ where: { userId }, select: { totalEarnings: true } }),
    prisma.contract.findMany({ where: { freelancerId: userId }, include: { project: true, client: { select: { id: true, name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }),
    prisma.contract.findMany({ where: { freelancerId: userId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  res.json({ summary: { proposals, pendingProposals, activeContracts, completedContracts, savedProjects, totalEarnings: earnings?.totalEarnings || 0 }, recentContracts: contracts, activity: activitySeries(recentContracts), activityLabel: 'Contracts started' });
}));
export default router;
