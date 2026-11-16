import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { calculateSmartMatch } from '../utils/smartMatch.js';

const router = Router();

// Category inference helper mapping skills to common freelance disciplines
const SKILL_TO_CATEGORY = {
  react: 'Development & IT',
  nodejs: 'Development & IT',
  'node.js': 'Development & IT',
  javascript: 'Development & IT',
  typescript: 'Development & IT',
  python: 'Development & IT',
  java: 'Development & IT',
  php: 'Development & IT',
  html: 'Development & IT',
  css: 'Development & IT',
  figma: 'Design & Creative',
  ui: 'Design & Creative',
  ux: 'Design & Creative',
  'ui/ux': 'Design & Creative',
  illustration: 'Design & Creative',
  photoshop: 'Design & Creative',
  content: 'Writing & Content',
  copywriting: 'Writing & Content',
  blog: 'Writing & Content',
  seo: 'Marketing',
  marketing: 'Marketing',
  analytics: 'Data & Analytics',
  sql: 'Data & Analytics',
};

/**
 * GET /api/smartmatch/recommendations
 * Protected: Freelancers only
 */
router.get('/recommendations', requireAuth, requireRole('FREELANCER'), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { category, minScore = 0, page = '1', limit = '15' } = req.query;

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const minThreshold = Math.max(0, Math.min(100, parseInt(minScore, 10) || 0));

  // 1. Fetch freelancer profile and historical engagements
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      freelancerProfile: true,
      proposals: {
        select: {
          projectId: true,
          project: { select: { category: true } },
        },
      },
      freelancerContracts: {
        select: {
          amount: true,
          project: { select: { category: true } },
        },
      },
    },
  });

  if (!user || user.role !== 'FREELANCER') {
    throw new HttpError(403, 'SmartMatch is exclusive to freelancer workspaces.');
  }

  const profile = user.freelancerProfile || {};
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const hourlyRate = profile.hourlyRate ? Number(profile.hourlyRate) : null;
  const experience = profile.experience || '';

  // 2. Derive average contract value
  const contracts = user.freelancerContracts || [];
  let avgContractAmount = null;
  if (contracts.length > 0) {
    const totalContractSum = contracts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    avgContractAmount = totalContractSum / contracts.length;
  }

  // 3. Derive preferred categories from past contracts, proposals, and skills
  const categoryFrequency = {};
  for (const c of contracts) {
    if (c.project?.category) {
      categoryFrequency[c.project.category] = (categoryFrequency[c.project.category] || 0) + 3; // contracts weighted x3
    }
  }
  for (const p of user.proposals || []) {
    if (p.project?.category) {
      categoryFrequency[p.project.category] = (categoryFrequency[p.project.category] || 0) + 1;
    }
  }

  // Fallback: infer categories from profile skills
  if (Object.keys(categoryFrequency).length === 0) {
    for (const sk of skills) {
      const lower = sk.toLowerCase().trim();
      const mapped = SKILL_TO_CATEGORY[lower];
      if (mapped) {
        categoryFrequency[mapped] = (categoryFrequency[mapped] || 0) + 1;
      }
    }
  }

  const preferredCategories = Object.entries(categoryFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const freelancerMatchingData = {
    skills,
    hourlyRate,
    avgContractAmount,
    experience,
    preferredCategories,
  };

  // 4. Exclude projects on which the freelancer has already submitted a proposal
  const appliedProjectIds = (user.proposals || []).map((prop) => prop.projectId);

  // 5. Query open, active marketplace projects
  const whereFilter = {
    status: 'OPEN',
    clientId: { not: userId }, // cannot match own projects
  };

  if (appliedProjectIds.length > 0) {
    whereFilter.id = { notIn: appliedProjectIds };
  }

  if (category && category !== 'All categories' && typeof category === 'string') {
    whereFilter.category = category.trim();
  }

  const candidateProjects = await prisma.project.findMany({
    where: whereFilter,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          location: true,
        },
      },
      _count: {
        select: {
          proposals: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 120, // Candidate evaluation pool
  });

  // 6. Score and rank every candidate project with the SmartMatch engine
  const scoredList = candidateProjects
    .map((project) => {
      const match = calculateSmartMatch(freelancerMatchingData, {
        title: project.title,
        description: project.description,
        category: project.category,
        skills: project.skills,
        budgetMin: Number(project.budgetMin),
        budgetMax: Number(project.budgetMax),
      });

      return {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          category: project.category,
          skills: project.skills,
          budgetMin: Number(project.budgetMin),
          budgetMax: Number(project.budgetMax),
          deadline: project.deadline,
          teamEnabled: project.teamEnabled,
          teamSize: project.teamSize,
          createdAt: project.createdAt,
          client: project.client,
          _count: project._count,
        },
        matchScore: match.score,
        breakdown: match.breakdown,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchReasons: match.reasons,
      };
    })
    .filter((item) => item.matchScore >= minThreshold)
    .sort((a, b) => {
      // Primary sort: Match score descending
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      // Secondary tie-breaker: Newest project first
      return new Date(b.project.createdAt) - new Date(a.project.createdAt);
    });

  // 7. Paginate results
  const total = scoredList.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const offset = (pageNumber - 1) * pageSize;
  const paginated = scoredList.slice(offset, offset + pageSize);

  res.json({
    recommendations: paginated,
    profileSummary: {
      hasSkills: skills.length > 0,
      skillsCount: skills.length,
      skills,
      hasHourlyRate: Boolean(hourlyRate),
      hourlyRate,
      hasExperience: Boolean(experience && experience.trim()),
      experience,
      primaryCategory: preferredCategories[0] || null,
      isProfileComplete: skills.length > 0 && Boolean(hourlyRate),
    },
    total,
    page: pageNumber,
    totalPages,
  });
}));

export default router;
