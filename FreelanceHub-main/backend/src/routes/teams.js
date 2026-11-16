import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
const memberStatuses = ['PENDING', 'ACCEPTED'];
const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

function text(value, maxLength, field, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maxLength) {
    throw new HttpError(400, `${field} must contain ${required ? '1 to ' : 'no more than '}${maxLength} characters.`);
  }
  return normalized;
}

function validDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} must be a valid date.`);
  return date;
}

async function getProjectAccess(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
    },
  });
  if (!project || !project.teamEnabled) throw new HttpError(404, 'Team project not found.');
  const member = await prisma.projectMember.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId: userId } },
  });
  const isOwner = project.clientId === userId;
  const isMember = member?.status === 'ACCEPTED';
  if (!isOwner && !isMember && member?.status !== 'PENDING') {
    throw new HttpError(404, 'Team project not found.');
  }
  return { project, member, isOwner, isMember };
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (!['CLIENT', 'FREELANCER'].includes(req.user.role)) {
    throw new HttpError(403, 'Team workspaces are available to clients and freelancers.');
  }

  if (req.user.role === 'CLIENT') {
    const items = await prisma.project.findMany({
      where: { clientId: req.user.id, teamEnabled: true },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true } },
        _count: {
          select: {
            teamMembers: { where: { status: 'ACCEPTED' } },
            teamTasks: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ items: items.map((project) => ({ project, membership: null })) });
  }

  const memberships = await prisma.projectMember.findMany({
    where: { freelancerId: req.user.id, status: { in: memberStatuses } },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true, avatarUrl: true } },
          _count: {
            select: {
              teamMembers: { where: { status: 'ACCEPTED' } },
              teamTasks: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ items: memberships.map((membership) => ({ project: membership.project, membership })) });
}));

router.get('/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  const [members, tasks, messages] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: access.project.id, status: { in: memberStatuses } },
      include: {
        freelancer: {
          select: {
            id: true, name: true, avatarUrl: true, location: true, isVerified: true,
            freelancerProfile: { select: { headline: true, skills: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    }),
    access.member?.status === 'PENDING' && !access.isOwner ? Promise.resolve([]) : prisma.projectTask.findMany({
      where: { projectId: access.project.id },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    access.member?.status === 'PENDING' && !access.isOwner ? Promise.resolve([]) : prisma.projectMessage.findMany({
      where: { projectId: access.project.id },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
  ]);

  res.json({
    project: access.project,
    members,
    tasks,
    messages,
    access: { isOwner: access.isOwner, isMember: access.isMember, invitation: access.member?.status === 'PENDING' ? access.member : null },
  });
}));


router.post('/:projectId/messages', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  if (!access.isOwner && !access.isMember) throw new HttpError(403, 'Accept the team invitation before joining the discussion.');

  const content = text(req.body.content, 4000, 'Message', true);
  const message = await prisma.projectMessage.create({
    data: { projectId: access.project.id, senderId: req.user.id, content },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, role: true } } },
  });

  const activeMembers = await prisma.projectMember.findMany({
    where: { projectId: access.project.id, status: 'ACCEPTED' },
    select: { freelancerId: true },
  });
  const recipients = new Set([access.project.clientId, ...activeMembers.map((member) => member.freelancerId)]);
  const io = req.app.get('io');
  for (const recipientId of recipients) {
    if (recipientId !== req.user.id) {
      io?.to(`user:${recipientId}`).emit('team:message:new', { projectId: access.project.id, message });
    }
  }

  res.status(201).json({ message });
}));

router.post('/:projectId/invitations', requireAuth, asyncHandler(async (req, res) => {
  const { freelancerId } = req.body;
  const roleLabel = text(req.body.roleLabel ?? 'Contributor', 60, 'Team role', true);
  if (typeof freelancerId !== 'string' || !freelancerId.trim()) {
    throw new HttpError(400, 'Choose a freelancer to invite.');
  }

  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project || project.clientId !== req.user.id || !project.teamEnabled) {
    throw new HttpError(404, 'Team project not found.');
  }
  if (['COMPLETED', 'CANCELLED'].includes(project.status)) {
    throw new HttpError(409, 'This project is no longer accepting team members.');
  }

  const freelancer = await prisma.user.findFirst({
    where: { id: freelancerId.trim(), role: 'FREELANCER', isActive: true },
    select: { id: true, name: true },
  });
  if (!freelancer) throw new HttpError(404, 'Active freelancer not found.');
  if (freelancer.id === req.user.id) throw new HttpError(400, 'You cannot invite your own account.');

  const invitation = await prisma.$transaction(async (tx) => {
    const current = await tx.project.findUnique({ where: { id: project.id } });
    if (!current || current.clientId !== req.user.id || !current.teamEnabled || ['COMPLETED', 'CANCELLED'].includes(current.status)) {
      throw new HttpError(409, 'This project is no longer accepting team members.');
    }

    const existing = await tx.projectMember.findUnique({
      where: { projectId_freelancerId: { projectId: current.id, freelancerId: freelancer.id } },
    });
    if (existing && memberStatuses.includes(existing.status)) {
      throw new HttpError(409, 'This freelancer is already on the team or has a pending invitation.');
    }

    const reserved = await tx.projectMember.count({
      where: { projectId: current.id, status: { in: memberStatuses } },
    });
    if (reserved >= current.teamSize) {
      throw new HttpError(409, 'The project team is already at its maximum size.');
    }

    const created = existing
      ? await tx.projectMember.update({
        where: { id: existing.id },
        data: { status: 'PENDING', invitedById: req.user.id, roleLabel, acceptedAt: null },
        include: { freelancer: { select: { id: true, name: true, avatarUrl: true } } },
      })
      : await tx.projectMember.create({
        data: { projectId: current.id, freelancerId: freelancer.id, invitedById: req.user.id, roleLabel },
        include: { freelancer: { select: { id: true, name: true, avatarUrl: true } } },
      });

    await tx.notification.create({
      data: {
        userId: freelancer.id,
        type: 'SYSTEM',
        title: 'Team invitation received',
        message: `You have been invited to join ${current.title} as ${roleLabel}.`,
        link: `/app/teams/${current.id}`,
      },
    });
    return created;
  }, { isolationLevel: 'Serializable' });

  res.status(201).json({ invitation });
}));

router.patch('/:projectId/invitations/:memberId', requireAuth, asyncHandler(async (req, res) => {
  const { response } = req.body;
  if (!['ACCEPTED', 'DECLINED'].includes(response)) {
    throw new HttpError(400, 'Choose whether to accept or decline the invitation.');
  }
  const invitation = await prisma.projectMember.findFirst({
    where: { id: req.params.memberId, projectId: req.params.projectId, freelancerId: req.user.id },
    include: { project: true },
  });
  if (!invitation || invitation.status !== 'PENDING' || req.user.role !== 'FREELANCER') {
    throw new HttpError(404, 'Pending team invitation not found.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentProject = await tx.project.findUnique({ where: { id: invitation.projectId } });
    const changed = await tx.projectMember.updateMany({
      where: { id: invitation.id, freelancerId: req.user.id, status: 'PENDING' },
      data: { status: response, acceptedAt: response === 'ACCEPTED' ? new Date() : null },
    });
    if (changed.count !== 1) throw new HttpError(409, 'This invitation has already been processed.');

    if (response === 'ACCEPTED') {
      if (!currentProject || ['COMPLETED', 'CANCELLED'].includes(currentProject.status)) {
        throw new HttpError(409, 'This project is no longer accepting team members.');
      }
      await tx.project.updateMany({
        where: { id: invitation.projectId, status: 'OPEN' },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await tx.notification.create({
      data: {
        userId: invitation.project.clientId,
        type: 'SYSTEM',
        title: response === 'ACCEPTED' ? 'Freelancer joined your team' : 'Team invitation declined',
        message: response === 'ACCEPTED'
          ? `${req.user.name} accepted the invitation for ${invitation.project.title}.`
          : `${req.user.name} declined the invitation for ${invitation.project.title}.`,
        link: `/app/teams/${invitation.projectId}`,
      },
    });

    return tx.projectMember.findUnique({
      where: { id: invitation.id },
      include: { freelancer: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }, { isolationLevel: 'Serializable' });

  res.json({ membership: result });
}));

router.post('/:projectId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  if (!access.isOwner && !access.isMember) throw new HttpError(403, 'Accept the team invitation before creating tasks.');

  const title = text(req.body.title, 120, 'Task title', true);
  if (title.length < 3) throw new HttpError(400, 'Task title must contain at least 3 characters.');
  const description = text(req.body.description ?? '', 2000, 'Task description') ?? '';
  const dueDate = validDate(req.body.dueDate, 'Task due date');
  const assigneeId = req.body.assigneeId === '' || req.body.assigneeId === null || req.body.assigneeId === undefined
    ? null : req.body.assigneeId;
  if (assigneeId !== null && typeof assigneeId !== 'string') throw new HttpError(400, 'Choose a valid team member.');

  if (assigneeId) {
    const activeMember = await prisma.projectMember.findFirst({
      where: { projectId: access.project.id, freelancerId: assigneeId, status: 'ACCEPTED' },
    });
    if (!activeMember) throw new HttpError(400, 'Tasks can only be assigned to active team members.');
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.projectTask.create({
      data: { projectId: access.project.id, title, description: description || null, assigneeId, createdById: req.user.id, dueDate },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } }, createdBy: { select: { id: true, name: true } } },
    });
    if (assigneeId && assigneeId !== req.user.id) {
      await tx.notification.create({
        data: {
          userId: assigneeId, type: 'SYSTEM', title: 'A task was assigned to you',
          message: `You were assigned "${title}" in ${access.project.title}.`,
          link: `/app/teams/${access.project.id}`,
        },
      });
    }
    return created;
  });
  res.status(201).json({ task });
}));

router.patch('/:projectId/tasks/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  if (!access.isOwner && !access.isMember) throw new HttpError(403, 'Accept the team invitation before updating tasks.');

  const task = await prisma.projectTask.findFirst({ where: { id: req.params.taskId, projectId: access.project.id } });
  if (!task) throw new HttpError(404, 'Task not found.');
  const isAssigned = task.assigneeId === req.user.id;
  const isCreator = task.createdById === req.user.id;
  if (!access.isOwner && !isAssigned && !isCreator) {
    throw new HttpError(403, 'Only the client, task creator, or assigned freelancer can update this task.');
  }

  const data = {};
  if (req.body.status !== undefined) {
    if (!taskStatuses.includes(req.body.status)) throw new HttpError(400, 'Choose a valid task status.');
    if (!access.isOwner && !isAssigned) {
      throw new HttpError(403, 'Only the client or assigned freelancer can change task status.');
    }
    data.status = req.body.status;
  }
  const canEditTaskDetails = access.isOwner || isCreator;
  for (const [key, max, field] of [['title', 120, 'Task title'], ['description', 2000, 'Task description']]) {
    if (req.body[key] !== undefined) {
      if (!canEditTaskDetails) throw new HttpError(403, 'Only the client or task creator can edit task details.');
      const value = text(req.body[key], max, field, key === 'title');
      if (key === 'title' && value.length < 3) throw new HttpError(400, 'Task title must contain at least 3 characters.');
      data[key] = value || null;
    }
  }
  if (req.body.dueDate !== undefined) {
    if (!canEditTaskDetails) throw new HttpError(403, 'Only the client or task creator can edit task details.');
    data.dueDate = validDate(req.body.dueDate, 'Task due date');
  }
  if (req.body.assigneeId !== undefined) {
    if (!access.isOwner) throw new HttpError(403, 'Only the client can reassign a task.');
    const assigneeId = req.body.assigneeId === '' || req.body.assigneeId === null ? null : req.body.assigneeId;
    if (assigneeId !== null && typeof assigneeId !== 'string') throw new HttpError(400, 'Choose a valid team member.');
    if (assigneeId) {
      const activeMember = await prisma.projectMember.findFirst({
        where: { projectId: access.project.id, freelancerId: assigneeId, status: 'ACCEPTED' },
      });
      if (!activeMember) throw new HttpError(400, 'Tasks can only be assigned to active team members.');
    }
    data.assigneeId = assigneeId;
  }
  if (Object.keys(data).length === 0) throw new HttpError(400, 'Provide at least one task field to update.');

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.projectTask.update({
      where: { id: task.id }, data,
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } }, createdBy: { select: { id: true, name: true } } },
    });
    const assigneeChanged = Object.hasOwn(data, 'assigneeId') && data.assigneeId && data.assigneeId !== task.assigneeId;
    if (assigneeChanged) {
      await tx.notification.create({
        data: {
          userId: data.assigneeId, type: 'SYSTEM', title: 'A task was assigned to you',
          message: `You were assigned "${record.title}" in ${access.project.title}.`,
          link: `/app/teams/${access.project.id}`,
        },
      });
    }
    if (data.status && data.status !== task.status && !access.isOwner) {
      await tx.notification.create({
        data: {
          userId: access.project.clientId, type: 'SYSTEM', title: 'Team task updated',
          message: `${req.user.name} moved "${record.title}" to ${data.status.replaceAll('_', ' ').toLowerCase()}.`,
          link: `/app/teams/${access.project.id}`,
        },
      });
    }
    return record;
  });
  res.json({ task: updated });
}));

router.delete('/:projectId/tasks/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  if (!access.isOwner) throw new HttpError(403, 'Only the project client can delete team tasks.');
  const deleted = await prisma.projectTask.deleteMany({
    where: { id: req.params.taskId, projectId: access.project.id },
  });
  if (deleted.count !== 1) throw new HttpError(404, 'Task not found.');
  res.json({ message: 'Task deleted.' });
}));

router.delete('/:projectId/members/:memberId', requireAuth, asyncHandler(async (req, res) => {
  const access = await getProjectAccess(req.params.projectId, req.user.id);
  const member = await prisma.projectMember.findFirst({
    where: { id: req.params.memberId, projectId: access.project.id, status: { in: memberStatuses } },
  });
  if (!member) throw new HttpError(404, 'Team member not found.');
  if (!access.isOwner && member.freelancerId !== req.user.id) {
    throw new HttpError(403, 'You cannot remove another team member.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.update({ where: { id: member.id }, data: { status: 'REVOKED' } });
    await tx.projectTask.updateMany({
      where: { projectId: access.project.id, assigneeId: member.freelancerId },
      data: { assigneeId: null },
    });
    if (access.isOwner && member.freelancerId !== req.user.id) {
      await tx.notification.create({
        data: {
          userId: member.freelancerId, type: 'SYSTEM', title: 'Team membership updated',
          message: `Your access to ${access.project.title} has been removed by the client.`,
          link: '/app/teams',
        },
      });
    }
  });
  res.json({ message: access.isOwner ? 'Team member removed.' : 'You left the team.' });
}));

export default router;
