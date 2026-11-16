import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError, cleanUser } from '../utils/http.js';
import { buildTrustScore } from '../utils/trustScore.js';

const router = Router();

function optionalHttpUrl(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new HttpError(400, `${fieldName} must be a valid HTTP or HTTPS URL.`);

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new HttpError(400, `${fieldName} must be a valid HTTP or HTTPS URL.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpError(400, `${fieldName} must use HTTP or HTTPS.`);
  }
  return parsed.toString();
}

router.get('/freelancers', asyncHandler(async (req, res) => {
  const { q = '', skill, page = '1' } = req.query;
  const pageNumber = Number(page);
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) throw new HttpError(400, 'Page must be a positive whole number.');
  const filters = [
    ...(q ? [{ OR: [
      { name: { contains: String(q).trim().slice(0, 120), mode: 'insensitive' } },
      { bio: { contains: String(q).trim().slice(0, 120), mode: 'insensitive' } },
      { freelancerProfile: { is: { headline: { contains: String(q).trim().slice(0, 120), mode: 'insensitive' } } } },
    ] }] : []),
    ...(skill ? [{ freelancerProfile: { is: { skills: { has: String(skill).slice(0, 60) } } } }] : []),
  ];
  const take = 12;
  const where = { role: 'FREELANCER', isActive: true, ...(filters.length ? { AND: filters } : {}) };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, include: { freelancerProfile: true, _count: { select: { reviewsReceived: true } } }, orderBy: { createdAt: 'desc' }, skip: (pageNumber - 1) * take, take }),
    prisma.user.count({ where }),
  ]);
  const ratings = await Promise.all(items.map((u) => prisma.review.aggregate({ where: { revieweeId: u.id }, _avg: { rating: true } })));
  const enriched = await Promise.all(items.map(async (u, i) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, bio: u.bio, location: u.location, website: u.website, isVerified: u.isVerified, createdAt: u.createdAt, freelancerProfile: u.freelancerProfile, averageRating: ratings[i]._avg.rating || 0, reviewCount: u._count.reviewsReceived, trustScore: await buildTrustScore(prisma, u.id, u) })));
  res.json({ items: enriched, total, page: pageNumber, pages: Math.ceil(total / take) });
}));

router.get('/freelancers/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.params.id, role: 'FREELANCER', isActive: true }, include: { freelancerProfile: true, reviewsReceived: { include: { reviewer: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 10 } } });
  if (!user) throw new HttpError(404, 'Freelancer not found.');
  const rating = await prisma.review.aggregate({ where: { revieweeId: user.id }, _avg: { rating: true }, _count: { _all: true } });
  const { id, name, avatarUrl, bio, location, website, isVerified, createdAt, freelancerProfile, reviewsReceived } = user;
  const trustScore = await buildTrustScore(prisma, user.id, user);
  res.json({ freelancer: { id, name, avatarUrl, bio, location, website, isVerified, createdAt, freelancerProfile, reviewsReceived, averageRating: rating._avg.rating || 0, reviewCount: rating._count._all, trustScore } });
}));

router.get('/me/trust-score', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'FREELANCER') throw new HttpError(403, 'TrustScore is available for freelancer accounts.');
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { freelancerProfile: true } });
  res.json({ trustScore: await buildTrustScore(prisma, req.user.id, user) });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { name, bio, location, website, avatarUrl, headline, skills, hourlyRate, experience, portfolioUrl, companyName, industry } = req.body;

  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 80)) {
    throw new HttpError(400, 'Name must contain between 1 and 80 characters.');
  }

  const safeWebsite = optionalHttpUrl(website, 'Website');
  const safeAvatarUrl = optionalHttpUrl(avatarUrl, 'Avatar URL');
  const safePortfolioUrl = optionalHttpUrl(portfolioUrl, 'Portfolio URL');

  let normalizedRate;
  if (hourlyRate !== undefined) {
    normalizedRate = hourlyRate === null || hourlyRate === '' ? null : Number(hourlyRate);
    if (normalizedRate !== null && (!Number.isFinite(normalizedRate) || normalizedRate < 0 || normalizedRate > 99999999.99)) {
      throw new HttpError(400, 'Hourly rate must be a valid non-negative amount.');
    }
  }

  let normalizedSkills;
  if (skills !== undefined) {
    if (!Array.isArray(skills)) throw new HttpError(400, 'Skills must be provided as a list.');
    normalizedSkills = [...new Set(skills.map((value) => String(value).trim()).filter(Boolean))].slice(0, 15).map((value) => value.slice(0, 60));
  }

  const userData = {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(bio !== undefined ? { bio: String(bio).slice(0, 2000) } : {}),
    ...(location !== undefined ? { location: String(location).slice(0, 120) } : {}),
    ...(safeWebsite !== undefined ? { website: safeWebsite } : {}),
    ...(safeAvatarUrl !== undefined ? { avatarUrl: safeAvatarUrl } : {}),
  };

  const full = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user.id }, data: userData });

    if (req.user.role === 'FREELANCER') {
      const profileData = {
        ...(headline !== undefined ? { headline: String(headline).trim().slice(0, 140) || null } : {}),
        ...(normalizedSkills !== undefined ? { skills: normalizedSkills } : {}),
        ...(normalizedRate !== undefined ? { hourlyRate: normalizedRate } : {}),
        ...(experience !== undefined ? { experience: String(experience).slice(0, 2000) || null } : {}),
        ...(safePortfolioUrl !== undefined ? { portfolioUrl: safePortfolioUrl } : {}),
      };
      await tx.freelancerProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, ...profileData },
        update: profileData,
      });
    } else if (req.user.role === 'CLIENT') {
      const profileData = {
        ...(companyName !== undefined ? { companyName: String(companyName).slice(0, 120) || null } : {}),
        ...(industry !== undefined ? { industry: String(industry).slice(0, 120) || null } : {}),
      };
      await tx.clientProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, ...profileData },
        update: profileData,
      });
    }

    return tx.user.findUnique({
      where: { id: req.user.id },
      include: { freelancerProfile: true, clientProfile: true },
    });
  });

  res.json({ user: cleanUser(full) });
}));

export default router;
