import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
const MAX_BUDGET = 99999999.99;
const projectInclude = {
  client: { select: { id: true, name: true, avatarUrl: true, location: true, isVerified: true } },
  _count: { select: { proposals: true, teamMembers: { where: { status: 'ACCEPTED' } } } },
};

function normalizeSkills(skills) {
  if (!Array.isArray(skills) || skills.length > 15) {
    throw new HttpError(400, 'Provide no more than 15 skills as a list.');
  }
  if (skills.some((skill) => typeof skill !== 'string' || skill.trim().length > 60)) {
    throw new HttpError(400, 'Each skill must be text containing at most 60 characters.');
  }
  return [...new Set(skills.map((skill) => skill.trim()).filter(Boolean))];
}

function validBudget(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_BUDGET;
}

router.get('/', asyncHandler(async (req, res) => {
  const { q = '', category, skill, minBudget, maxBudget, page = '1', sort = 'newest' } = req.query;
  const pageNumber = Number(page);
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100000) {
    throw new HttpError(400, 'Page must be a positive whole number within the supported range.');
  }
  if (q !== undefined && typeof q !== 'string') throw new HttpError(400, 'Search query must be text.');
  if (category !== undefined && typeof category !== 'string') throw new HttpError(400, 'Category must be text.');
  if (skill !== undefined && typeof skill !== 'string') throw new HttpError(400, 'Skill must be text.');

  if (minBudget !== undefined && minBudget !== '' && (!Number.isFinite(Number(minBudget)) || Number(minBudget) < 0 || Number(minBudget) > MAX_BUDGET)) {
    throw new HttpError(400, 'Minimum budget must be a valid non-negative amount.');
  }
  if (maxBudget !== undefined && maxBudget !== '' && (!Number.isFinite(Number(maxBudget)) || Number(maxBudget) < 0 || Number(maxBudget) > MAX_BUDGET)) {
    throw new HttpError(400, 'Maximum budget must be a valid non-negative amount.');
  }
  if (minBudget !== undefined && minBudget !== '' && maxBudget !== undefined && maxBudget !== '' && Number(minBudget) > Number(maxBudget)) {
    throw new HttpError(400, 'Minimum budget cannot exceed maximum budget.');
  }

  const take = 12;
  const query = q.trim().slice(0, 120);
  const where = {
    status: 'OPEN',
    ...(query ? { OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ] } : {}),
    ...(category ? { category: category.trim().slice(0, 80) } : {}),
    ...(skill ? { skills: { has: skill.trim().slice(0, 60) } } : {}),
    ...(minBudget !== undefined && minBudget !== '' ? { budgetMax: { gte: Number(minBudget) } } : {}),
    ...(maxBudget !== undefined && maxBudget !== '' ? { budgetMin: { lte: Number(maxBudget) } } : {}),
  };

  const orderBy = sort === 'budget-high'
    ? { budgetMax: 'desc' }
    : sort === 'budget-low'
      ? { budgetMin: 'asc' }
      : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy,
      skip: (pageNumber - 1) * take,
      take,
    }),
    prisma.project.count({ where }),
  ]);
  res.json({ items, total, page: pageNumber, pages: Math.ceil(total / take) });
}));

router.get('/saved', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const items = await prisma.savedProject.findMany({
    where: { userId: req.user.id },
    include: { project: { include: projectInclude } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
}));

router.get('/mine', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const items = await prisma.project.findMany({
    where: { clientId: req.user.id },
    include: projectInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { ...projectInclude, contract: { select: { id: true, status: true } } },
  });
  if (!project) throw new HttpError(404, 'Project not found.');
  res.json({ project });
}));

router.post('/', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const { title, description, category, skills = [], budgetMin, budgetMax, deadline, teamEnabled = false, teamSize = 1 } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 140
    || typeof description !== 'string' || !description.trim() || description.trim().length > 5000
    || typeof category !== 'string' || !category.trim() || category.trim().length > 80
    || !validBudget(budgetMin) || !validBudget(budgetMax) || Number(budgetMax) < Number(budgetMin)
    || typeof teamEnabled !== 'boolean'
    || !Number.isSafeInteger(Number(teamSize))
    || (teamEnabled && (Number(teamSize) < 2 || Number(teamSize) > 12))) {
    throw new HttpError(400, 'Enter a valid title, description, category and positive budget range.');
  }

  const normalizedSkills = normalizeSkills(skills);
  const deadlineDate = deadline ? new Date(deadline) : null;
  if (deadlineDate && Number.isNaN(deadlineDate.getTime())) {
    throw new HttpError(400, 'Enter a valid project deadline.');
  }

  const project = await prisma.project.create({
    data: {
      clientId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      skills: normalizedSkills,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      deadline: deadlineDate,
      teamEnabled,
      teamSize: teamEnabled ? Number(teamSize) : 1,
    },
    include: projectInclude,
  });
  res.status(201).json({ project });
}));

router.patch('/:id', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, 'Project not found.');
  if (existing.clientId !== req.user.id) throw new HttpError(403, 'You can only edit your own projects.');
  if (!['OPEN', 'DRAFT'].includes(existing.status)) throw new HttpError(400, 'Only open or draft projects can be edited.');

  const { title, description, category, skills, budgetMin, budgetMax, deadline, status, teamEnabled, teamSize } = req.body;
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 140)) {
    throw new HttpError(400, 'Project title must contain between 1 and 140 characters.');
  }
  if (description !== undefined && (typeof description !== 'string' || !description.trim() || description.trim().length > 5000)) {
    throw new HttpError(400, 'Project description must contain between 1 and 5,000 characters.');
  }
  if (category !== undefined && (typeof category !== 'string' || !category.trim() || category.trim().length > 80)) {
    throw new HttpError(400, 'Project category must contain between 1 and 80 characters.');
  }
  if (status !== undefined && !['OPEN', 'CANCELLED'].includes(status)) {
    throw new HttpError(400, 'Choose a valid project status.');
  }

  const nextMin = budgetMin !== undefined ? Number(budgetMin) : Number(existing.budgetMin);
  const nextMax = budgetMax !== undefined ? Number(budgetMax) : Number(existing.budgetMax);
  if (!validBudget(nextMin) || !validBudget(nextMax) || nextMax < nextMin) {
    throw new HttpError(400, 'Enter a valid positive budget range.');
  }

  if (teamEnabled !== undefined && typeof teamEnabled !== 'boolean') {
    throw new HttpError(400, 'Team collaboration must be enabled or disabled.');
  }
  const nextTeamEnabled = teamEnabled !== undefined ? teamEnabled : existing.teamEnabled;
  const nextTeamSize = teamSize !== undefined ? Number(teamSize) : existing.teamSize;
  if (!Number.isSafeInteger(nextTeamSize) || (nextTeamEnabled && (nextTeamSize < 2 || nextTeamSize > 12))) {
    throw new HttpError(400, 'Choose a team size between 2 and 12 freelancers.');
  }
  if (!nextTeamEnabled && teamSize !== undefined && nextTeamSize !== 1) {
    throw new HttpError(400, 'A solo project must have a team size of 1.');
  }
  if (nextTeamEnabled !== existing.teamEnabled || nextTeamSize !== existing.teamSize) {
    const reservedMembers = await prisma.projectMember.count({
      where: { projectId: existing.id, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    if (!nextTeamEnabled) {
      const [taskCount, messageCount] = await Promise.all([
        prisma.projectTask.count({ where: { projectId: existing.id } }),
        prisma.projectMessage.count({ where: { projectId: existing.id } }),
      ]);
      if (reservedMembers > 0 || taskCount > 0 || messageCount > 0) {
        throw new HttpError(409, 'A team project with invitations, tasks, or discussion history cannot be converted to a solo project.');
      }
    }
    if (nextTeamEnabled && nextTeamSize < reservedMembers) {
      throw new HttpError(409, 'Team size cannot be lower than the number of active members and pending invitations.');
    }
  }

  const normalizedSkills = skills !== undefined ? normalizeSkills(skills) : undefined;
  const deadlineDate = deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined;
  if (deadlineDate && Number.isNaN(deadlineDate.getTime())) {
    throw new HttpError(400, 'Enter a valid project deadline.');
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(category !== undefined ? { category: category.trim() } : {}),
      ...(normalizedSkills !== undefined ? { skills: normalizedSkills } : {}),
      ...(budgetMin !== undefined ? { budgetMin: Number(budgetMin) } : {}),
      ...(budgetMax !== undefined ? { budgetMax: Number(budgetMax) } : {}),
      ...(deadline !== undefined ? { deadline: deadlineDate } : {}),
      ...(teamEnabled !== undefined ? { teamEnabled: nextTeamEnabled } : {}),
      ...(teamSize !== undefined || teamEnabled !== undefined ? { teamSize: nextTeamEnabled ? nextTeamSize : 1 } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: projectInclude,
  });
  res.json({ project });
}));

router.delete('/:id', requireAuth, requireRole('CLIENT'), asyncHandler(async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, 'Project not found.');
  if (existing.clientId !== req.user.id) throw new HttpError(403, 'You can only remove your own projects.');
  if (existing.status === 'IN_PROGRESS') throw new HttpError(400, 'An active project cannot be deleted.');
  await prisma.project.delete({ where: { id: existing.id } });
  res.json({ message: 'Project deleted.' });
}));

router.post('/:id/save', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw new HttpError(404, 'Project not found.');

  const existing = await prisma.savedProject.findUnique({
    where: { userId_projectId: { userId: req.user.id, projectId: project.id } },
  });
  if (existing) {
    await prisma.savedProject.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedProject.create({ data: { userId: req.user.id, projectId: project.id } });
  }
  res.json({ saved: !existing });
}));

export default router;
