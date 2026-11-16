import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
const MAX_BID = 99999999.99;
const MAX_DELIVERY_DAYS = 3650;

router.get('/mine', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const items = await prisma.proposal.findMany({
    where: { freelancerId: req.user.id },
    include: { project: { include: { client: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
}));

router.get('/project/:projectId', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project) throw new HttpError(404, 'Project not found.');
  if (project.clientId !== req.user.id) throw new HttpError(403, 'You can only view proposals for your own projects.');

  const items = await prisma.proposal.findMany({
    where: { projectId: project.id },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          location: true,
          bio: true,
          isVerified: true,
          freelancerProfile: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
}));

router.post('/project/:projectId', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const { coverLetter, bidAmount, deliveryDays } = req.body;
  const bid = Number(bidAmount);
  const days = Number(deliveryDays);
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project || project.status !== 'OPEN') throw new HttpError(404, 'This project is no longer accepting proposals.');
  if (project.clientId === req.user.id) throw new HttpError(400, 'You cannot apply to your own project.');

  if (typeof coverLetter !== 'string' || !coverLetter.trim() || coverLetter.trim().length > 4000
    || !Number.isFinite(bid) || bid <= 0 || bid > MAX_BID
    || !Number.isSafeInteger(days) || days < 1 || days > MAX_DELIVERY_DAYS) {
    throw new HttpError(400, 'Write a cover letter and enter a valid bid and delivery time.');
  }

  const proposal = await prisma.$transaction(async (tx) => {
    const currentProject = await tx.project.findUnique({ where: { id: project.id } });
    if (!currentProject || currentProject.status !== 'OPEN') {
      throw new HttpError(409, 'This project is no longer accepting proposals.');
    }

    const created = await tx.proposal.create({
      data: {
        projectId: project.id,
        freelancerId: req.user.id,
        coverLetter: coverLetter.trim(),
        bidAmount: bid,
        deliveryDays: days,
      },
    });

    await tx.notification.create({
      data: {
        userId: project.clientId,
        type: 'PROPOSAL_RECEIVED',
        title: 'New proposal received',
        message: `${req.user.name} submitted a proposal for ${project.title}.`,
        link: '/app/proposals',
      },
    });

    return created;
  }, { isolationLevel: 'Serializable' });

  res.status(201).json({ proposal });
}));

router.patch('/:id/status', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw new HttpError(400, 'Choose Accepted or Rejected.');
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  });
  if (!proposal) throw new HttpError(404, 'Proposal not found.');
  if (proposal.project.clientId !== req.user.id) throw new HttpError(403, 'You cannot manage this proposal.');
  if (proposal.status !== 'PENDING') throw new HttpError(409, 'This proposal has already been processed.');

  if (status === 'ACCEPTED') {
    const result = await prisma.$transaction(async (tx) => {
      const claimedProject = await tx.project.updateMany({
        where: { id: proposal.projectId, clientId: req.user.id, status: 'OPEN' },
        data: { status: 'IN_PROGRESS' },
      });
      if (claimedProject.count !== 1) {
        throw new HttpError(409, 'A freelancer has already been hired or this project is no longer open.');
      }

      const claimedProposal = await tx.proposal.updateMany({
        where: { id: proposal.id, projectId: proposal.projectId, status: 'PENDING' },
        data: { status: 'ACCEPTED' },
      });
      if (claimedProposal.count !== 1) {
        throw new HttpError(409, 'This proposal has already been processed.');
      }

      await tx.proposal.updateMany({
        where: { projectId: proposal.projectId, id: { not: proposal.id }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });

      let teamMembership = null;
      if (proposal.project.teamEnabled) {
        // Approval of an application on a collaborative project also accepts
        // the applicant into the team. Reuse any existing invitation row.
        const existingMembership = await tx.projectMember.findUnique({
          where: {
            projectId_freelancerId: {
              projectId: proposal.projectId,
              freelancerId: proposal.freelancerId,
            },
          },
        });
        const alreadyReserved = existingMembership
          && ['PENDING', 'ACCEPTED'].includes(existingMembership.status);

        if (!alreadyReserved) {
          const reservedSeats = await tx.projectMember.count({
            where: {
              projectId: proposal.projectId,
              status: { in: ['PENDING', 'ACCEPTED'] },
            },
          });
          if (reservedSeats >= proposal.project.teamSize) {
            throw new HttpError(409, 'The project team is full. Increase the team size or free a seat before approving this proposal.');
          }
        }

        teamMembership = existingMembership
          ? await tx.projectMember.update({
            where: { id: existingMembership.id },
            data: {
              status: 'ACCEPTED',
              acceptedAt: existingMembership.status === 'ACCEPTED' ? existingMembership.acceptedAt : new Date(),
              invitedById: req.user.id,
              ...(['PENDING', 'ACCEPTED'].includes(existingMembership.status) ? {} : { roleLabel: 'Project contributor' }),
            },
          })
          : await tx.projectMember.create({
            data: {
              projectId: proposal.projectId,
              freelancerId: proposal.freelancerId,
              invitedById: req.user.id,
              roleLabel: 'Project contributor',
              status: 'ACCEPTED',
              acceptedAt: new Date(),
            },
          });
      }

      const contract = await tx.contract.create({
        data: {
          projectId: proposal.projectId,
          proposalId: proposal.id,
          clientId: req.user.id,
          freelancerId: proposal.freelancerId,
          amount: proposal.bidAmount,
          dueDate: new Date(Date.now() + proposal.deliveryDays * 86400000),
        },
      });

      await tx.notification.create({
        data: {
          userId: proposal.freelancerId,
          type: 'PROPOSAL_ACCEPTED',
          title: 'Your proposal was accepted',
          message: `You were hired for ${proposal.project.title}.`,
          link: `/app/contracts/${contract.id}`,
        },
      });
      if (teamMembership) {
        await tx.notification.create({
          data: {
            userId: proposal.freelancerId,
            type: 'SYSTEM',
            title: 'You joined the project team',
            message: `You are now a member of the team for ${proposal.project.title}.`,
            link: `/app/teams/${proposal.projectId}`,
          },
        });
      }

      return {
        accepted: { ...proposal, status: 'ACCEPTED' },
        contract,
        ...(proposal.project.teamEnabled ? { membership: teamMembership } : {}),
      };
    }, { isolationLevel: 'Serializable' });

    return res.json(result);
  }

  const rejected = await prisma.$transaction(async (tx) => {
    const changed = await tx.proposal.updateMany({
      where: { id: proposal.id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    if (changed.count !== 1) throw new HttpError(409, 'This proposal has already been processed.');

    await tx.notification.create({
      data: {
        userId: proposal.freelancerId,
        type: 'PROPOSAL_REJECTED',
        title: 'Proposal update',
        message: `Your proposal for ${proposal.project.title} was not selected.`,
        link: '/app/proposals',
      },
    });
    return tx.proposal.findUnique({ where: { id: proposal.id } });
  }, { isolationLevel: 'Serializable' });

  res.json({ proposal: rejected });
}));

router.patch('/:id/withdraw', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
  if (!proposal || proposal.freelancerId !== req.user.id) throw new HttpError(404, 'Proposal not found.');

  const updated = await prisma.proposal.updateMany({
    where: { id: proposal.id, freelancerId: req.user.id, status: 'PENDING' },
    data: { status: 'WITHDRAWN' },
  });
  if (updated.count !== 1) throw new HttpError(409, 'Only pending proposals can be withdrawn.');

  const result = await prisma.proposal.findUnique({ where: { id: proposal.id } });
  res.json({ proposal: result });
}));

export default router;
