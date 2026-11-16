import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const router = Router();
const includeContract = {
  project: true,
  client: { select: { id: true, name: true, email: true, avatarUrl: true } },
  freelancer: { select: { id: true, name: true, email: true, avatarUrl: true } },
  milestones: { orderBy: { createdAt: 'asc' } },
  deliverables: { select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true, uploaderId: true }, orderBy: { createdAt: 'desc' } },
};

const MAX_DELIVERABLE_SIZE = 20 * 1024 * 1024;
const allowedFiles = new Map([
  ['.pdf', ['application/pdf']],
  ['.zip', ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']],
  ['.doc', ['application/msword', 'application/octet-stream']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
  ['.xls', ['application/vnd.ms-excel', 'application/octet-stream']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']],
  ['.ppt', ['application/vnd.ms-powerpoint', 'application/octet-stream']],
  ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream']],
  ['.txt', ['text/plain']],
  ['.csv', ['text/csv', 'application/csv', 'application/vnd.ms-excel']],
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.webp', ['image/webp']],
  ['.gif', ['image/gif']],
]);
const safeFileName = (value) => [...String(value || 'deliverable')].map((character) => ['/', '\\', '\r', '\n', '"'].includes(character) ? '_' : character).join('').slice(0, 180);

const canView = (contract, user) => user.role === 'ADMIN' || contract.clientId === user.id || contract.freelancerId === user.id;

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : req.user.role === 'CLIENT' ? { clientId: req.user.id } : { freelancerId: req.user.id };
  const items = await prisma.contract.findMany({ where, include: includeContract, orderBy: { updatedAt: 'desc' } });
  res.json({ items });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id }, include: includeContract });
  if (!contract) throw new HttpError(404, 'Contract not found.');
  if (!canView(contract, req.user)) throw new HttpError(403, 'You cannot view this contract.');
  res.json({ contract });
}));


router.put('/:id/deliverables', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, 'Contract not found.');
  if (contract.freelancerId !== req.user.id) throw new HttpError(403, 'Only the assigned freelancer can upload project work.');
  if (!['ACTIVE', 'REVISION_REQUESTED'].includes(contract.status)) throw new HttpError(400, 'Files can only be uploaded while work is active or being revised.');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Choose a file before uploading.');
  if (req.body.length > MAX_DELIVERABLE_SIZE) throw new HttpError(413, 'Files must be 20 MB or smaller.');
  const fileName = safeFileName(decodeURIComponent(req.get('x-file-name') || 'deliverable'));
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  const mimeType = String(req.get('x-file-type') || 'application/octet-stream').toLowerCase();
  const allowedMimeTypes = allowedFiles.get(extension);
  if (!allowedMimeTypes || !allowedMimeTypes.includes(mimeType)) {
    throw new HttpError(400, 'Unsupported file type. Upload PDF, Office documents, ZIP, text, CSV or image files.');
  }
  const deliverable = await prisma.deliverable.create({
    data: {
      contractId: contract.id,
      uploaderId: req.user.id,
      fileName,
      mimeType,
      fileSize: req.body.length,
      fileData: req.body,
    },
    select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true, uploaderId: true },
  });
  res.status(201).json({ deliverable });
}));

router.get('/:id/deliverables/:deliverableId/download', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract || !canView(contract, req.user)) throw new HttpError(404, 'Contract or file not found.');
  const file = await prisma.deliverable.findFirst({ where: { id: req.params.deliverableId, contractId: contract.id } });
  if (!file) throw new HttpError(404, 'File not found.');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.fileSize);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(file.fileData));
}));

router.post('/:id/milestones', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract || !canView(contract, req.user)) throw new HttpError(404, 'Contract not found.');
  if (contract.clientId !== req.user.id) throw new HttpError(403, 'Only the client can create milestones.');
  if (contract.status !== 'ACTIVE') throw new HttpError(400, 'Milestones can only be added to active contracts.');
  const { title, description, amount, dueDate } = req.body;
  const milestoneAmount = Number(amount);
  const dueDateValue = dueDate ? new Date(dueDate) : null;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 100
    || !Number.isFinite(milestoneAmount) || milestoneAmount <= 0
    || (dueDateValue && Number.isNaN(dueDateValue.getTime()))) {
    throw new HttpError(400, 'Enter a milestone title, positive amount and valid due date.');
  }

  // Keep the aggregate check and insert in one serializable transaction so
  // concurrent requests cannot over-allocate the contract budget.
  const milestone = await prisma.$transaction(async (tx) => {
    const currentContract = await tx.contract.findUnique({ where: { id: contract.id } });
    if (!currentContract || currentContract.status !== 'ACTIVE') {
      throw new HttpError(409, 'Milestones can only be added to active contracts.');
    }
    const aggregate = await tx.milestone.aggregate({ where: { contractId: contract.id }, _sum: { amount: true } });
    if (Number(aggregate._sum.amount || 0) + milestoneAmount > Number(currentContract.amount)) {
      throw new HttpError(400, 'Milestone amounts cannot exceed the contract value.');
    }
    return tx.milestone.create({
      data: {
        contractId: contract.id,
        title: title.trim(),
        description: description ? String(description).slice(0, 1000) : null,
        amount: milestoneAmount,
        dueDate: dueDateValue,
      },
    });
  }, { isolationLevel: 'Serializable' });

  res.status(201).json({ milestone });
}));

router.patch('/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id }, include: { project: true } });
  if (!contract || !canView(contract, req.user)) throw new HttpError(404, 'Contract not found.');
  const { status } = req.body;
  let updateData = {};
  let notificationUserId = null;
  let type = 'SYSTEM';
  let title = 'Contract updated';
  let message = 'A contract status has changed.';
  if (status === 'SUBMITTED' && req.user.id === contract.freelancerId && ['ACTIVE', 'REVISION_REQUESTED'].includes(contract.status)) {
    const latestFile = await prisma.deliverable.findFirst({ where: { contractId: contract.id }, orderBy: { createdAt: 'desc' } });
    if (!latestFile || (contract.submittedAt && latestFile.createdAt <= contract.submittedAt)) {
      throw new HttpError(400, 'Upload your completed work before submitting it to the client.');
    }
    updateData = { status, submittedAt: new Date() };
    notificationUserId = contract.clientId; type = 'WORK_SUBMITTED'; title = 'Work submitted'; message = `${req.user.name} submitted work for ${contract.project.title}.`;
  } else if (status === 'REVISION_REQUESTED' && req.user.id === contract.clientId && contract.status === 'SUBMITTED') {
    updateData = { status };
    notificationUserId = contract.freelancerId; type = 'REVISION_REQUESTED'; title = 'Revision requested'; message = `The client requested a revision for ${contract.project.title}.`;
  } else if (status === 'ACTIVE' && req.user.id === contract.freelancerId && contract.status === 'REVISION_REQUESTED') {
    updateData = { status };
    notificationUserId = contract.clientId; title = 'Work is being revised'; message = `The freelancer is working on requested revisions.`;
  } else if (status === 'COMPLETED' && req.user.id === contract.clientId && contract.status === 'SUBMITTED') {
    updateData = { status, completedAt: new Date() };
    notificationUserId = contract.freelancerId; type = 'PROJECT_COMPLETED'; title = 'Project completed'; message = `${contract.project.title} has been approved and completed.`;
  } else {
    throw new HttpError(400, 'That status change is not allowed for your role or the current contract status.');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.contract.update({ where: { id: contract.id }, data: updateData, include: includeContract });
    if (status === 'COMPLETED') {
      await tx.project.update({ where: { id: contract.projectId }, data: { status: 'COMPLETED' } });
      await tx.freelancerProfile.updateMany({ where: { userId: contract.freelancerId }, data: { completedJobs: { increment: 1 }, totalEarnings: { increment: contract.amount } } });
    }
    if (notificationUserId) await tx.notification.create({ data: { userId: notificationUserId, type, title, message, link: `/app/contracts/${contract.id}` } });
    return record;
  });
  res.json({ contract: updated });
}));


router.post('/:id/disputes', requireAuth, asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id }, include: { project: true } });
  if (!contract || !canView(contract, req.user) || req.user.role === 'ADMIN') throw new HttpError(404, 'Contract not found.');
  const { subject, description } = req.body;
  if (typeof subject !== 'string' || !subject.trim() || subject.trim().length > 200
    || typeof description !== 'string' || !description.trim() || description.trim().length > 3000) {
    throw new HttpError(400, 'Enter an issue subject (up to 200 characters) and description (up to 3,000 characters).');
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const existing = await tx.dispute.findFirst({
      where: { contractId: contract.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    });
    if (existing) throw new HttpError(409, 'There is already an open dispute for this contract.');

    const created = await tx.dispute.create({
      data: {
        contractId: contract.id,
        openedById: req.user.id,
        subject: subject.trim(),
        description: description.trim(),
      },
    });

    const admins = await tx.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    if (admins.length) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'SYSTEM',
          title: 'New contract dispute',
          message: `${req.user.name} reported an issue with ${contract.project.title}.`,
          link: '/app/admin/disputes',
        })),
      });
    }
    return created;
  }, { isolationLevel: 'Serializable' });

  res.status(201).json({ dispute });
}));

router.patch('/milestones/:milestoneId/status', requireAuth, asyncHandler(async (req, res) => {
  const milestone = await prisma.milestone.findUnique({ where: { id: req.params.milestoneId }, include: { contract: true } });
  if (!milestone || !canView(milestone.contract, req.user)) throw new HttpError(404, 'Milestone not found.');
  const { status } = req.body;
  let data;
  if (status === 'IN_PROGRESS' && req.user.id === milestone.contract.freelancerId && milestone.status === 'PENDING') data = { status };
  else if (status === 'SUBMITTED' && req.user.id === milestone.contract.freelancerId && ['PENDING', 'IN_PROGRESS'].includes(milestone.status)) data = { status, submittedAt: new Date() };
  else if (status === 'APPROVED' && req.user.id === milestone.contract.clientId && milestone.status === 'SUBMITTED') data = { status, completedAt: new Date() };
  else throw new HttpError(400, 'This milestone update is not permitted.');
  const updated = await prisma.milestone.update({ where: { id: milestone.id }, data });
  res.json({ milestone: updated });
}));

export default router;
