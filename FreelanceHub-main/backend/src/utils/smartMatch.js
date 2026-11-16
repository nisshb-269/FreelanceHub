/**
 * FreelanceHub SmartMatch – Intelligent Project Recommendation System
 * Modular rule-based matching engine.
 *
 * Weighted Criteria:
 *   - Skill Compatibility:       60%
 *   - Budget Compatibility:      20%
 *   - Experience Compatibility:  10%
 *   - Category Compatibility:    10%
 */

// Normalizes skill names for comparison: trims whitespace, collapses inner spaces, lowercases
export function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  return skill.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Skill Compatibility (60% weight)
 * Compares freelancer's skills against project required skills.
 */
export function calculateSkillScore(freelancerSkills = [], projectSkills = [], projectTitle = '', projectDesc = '') {
  const normFreelancer = new Set(
    (Array.isArray(freelancerSkills) ? freelancerSkills : [])
      .map(normalizeSkill)
      .filter(Boolean)
  );

  const rawProjectSkills = Array.isArray(projectSkills) ? projectSkills : [];
  const normProject = rawProjectSkills.map(normalizeSkill).filter(Boolean);

  // If project specifies required skills
  if (normProject.length > 0) {
    const matched = [];
    const missing = [];

    rawProjectSkills.forEach((rawSkill, idx) => {
      const norm = normProject[idx];
      if (norm && normFreelancer.has(norm)) {
        matched.push(rawSkill);
      } else {
        missing.push(rawSkill);
      }
    });

    const score = Math.round((matched.length / normProject.length) * 100);
    return {
      skillScore: Math.min(100, Math.max(0, score)),
      matchedSkills: matched,
      missingSkills: missing,
      evaluated: true,
      reason: `Matched ${matched.length} of ${normProject.length} required skill${normProject.length === 1 ? '' : 's'}`,
    };
  }

  // Graceful handling when project has no skills listed:
  // Check if any freelancer skills are mentioned in the project title or description
  const content = `${projectTitle} ${projectDesc}`.toLowerCase();
  const matchedFromContent = [];

  for (const rawSkill of freelancerSkills) {
    const norm = normalizeSkill(rawSkill);
    if (norm && norm.length >= 2) {
      const regex = new RegExp(`\\b${norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(content)) {
        matchedFromContent.push(rawSkill);
      }
    }
  }

  if (matchedFromContent.length > 0) {
    const bonus = Math.min(95, 70 + matchedFromContent.length * 10);
    return {
      skillScore: bonus,
      matchedSkills: matchedFromContent,
      missingSkills: [],
      evaluated: true,
      reason: `Keywords for ${matchedFromContent.length} of your skills found in project details`,
    };
  }

  // If freelancer has skills but project lists none and text has no match, award fair neutral baseline
  if (normFreelancer.size > 0) {
    return {
      skillScore: 75,
      matchedSkills: [],
      missingSkills: [],
      evaluated: false,
      reason: 'No specific technical skills specified for this project',
    };
  }

  // Freelancer has no skills in profile
  return {
    skillScore: 0,
    matchedSkills: [],
    missingSkills: [],
    evaluated: true,
    reason: 'Add skills to your profile to improve skill match accuracy',
  };
}

/**
 * Budget Compatibility (20% weight)
 * Compares project budget against freelancer rate and historic contract sizes.
 * Converts hourly rates to estimated project value (~40 hours baseline).
 */
export function calculateBudgetScore(hourlyRate, avgContractAmount, budgetMin, budgetMax) {
  const min = Number(budgetMin) || 0;
  const max = Number(budgetMax) || min;
  const projectMid = (min + max) / 2;

  // Derive freelancer's expected project scale
  const rate = Number(hourlyRate) || 0;
  const avg = Number(avgContractAmount) || 0;

  let expectedScale = null;
  if (avg > 0) {
    expectedScale = avg;
  } else if (rate > 0) {
    // 40 hours standard milestone baseline
    expectedScale = rate * 40;
  }

  // If no rate or past contracts exist, evaluate fairly
  if (!expectedScale || expectedScale <= 0) {
    return {
      budgetScore: 80,
      evaluated: false,
      reason: 'Project budget is within general platform range',
    };
  }

  // If project budget range envelops the expected scale
  if (expectedScale >= min && (max <= 0 || expectedScale <= max)) {
    return {
      budgetScore: 100,
      evaluated: true,
      reason: 'Project budget fits your rate and project size expectations perfectly',
    };
  }

  // Ratio comparison
  const ratio = projectMid / expectedScale;

  if (ratio >= 0.8 && ratio <= 1.5) {
    return {
      budgetScore: 95,
      evaluated: true,
      reason: 'Project budget is closely aligned with your rate',
    };
  }

  if (ratio > 1.5 && ratio <= 3.0) {
    return {
      budgetScore: 90,
      evaluated: true,
      reason: 'Generous project budget above your standard baseline',
    };
  }

  if (ratio >= 0.5 && ratio < 0.8) {
    return {
      budgetScore: 75,
      evaluated: true,
      reason: 'Project budget is slightly below your standard rate baseline',
    };
  }

  if (ratio >= 0.25 && ratio < 0.5) {
    return {
      budgetScore: 55,
      evaluated: true,
      reason: 'Project budget is moderately below your typical project scale',
    };
  }

  if (ratio < 0.25) {
    return {
      budgetScore: 35,
      evaluated: true,
      reason: 'Project budget is significantly below your rate expectations',
    };
  }

  // Above 3x
  return {
    budgetScore: 85,
    evaluated: true,
    reason: 'High-value enterprise project budget',
  };
}

/**
 * Experience Compatibility (10% weight)
 * Parses requested experience from project description/title and compares with freelancer experience.
 * Avoids penalizing freelancers when project does not specify experience.
 */
export function calculateExperienceScore(freelancerExp = '', projectTitle = '', projectDesc = '') {
  const content = `${projectTitle} ${projectDesc}`.toLowerCase();

  // Detect project level
  let projectReq = null;
  if (/\b(senior|lead|architect|principal|expert|5\+\s*years|6\+\s*years|7\+\s*years|8\+\s*years|10\+\s*years)\b/i.test(content)) {
    projectReq = 'EXPERT';
  } else if (/\b(intermediate|mid-level|mid\s*level|3\+\s*years|4\+\s*years|2-4\s*years|3-5\s*years)\b/i.test(content)) {
    projectReq = 'INTERMEDIATE';
  } else if (/\b(junior|entry|entry-level|beginner|fresher|intern|1\+\s*years?)\b/i.test(content)) {
    projectReq = 'ENTRY';
  }

  // When project does not specify an experience requirement: do NOT penalize
  if (!projectReq) {
    return {
      experienceScore: 100,
      evaluated: false,
      reason: 'Open to all experience levels; no specific tier required',
    };
  }

  // Parse freelancer experience
  const expStr = String(freelancerExp || '').toLowerCase();
  let freelancerLevel = 'INTERMEDIATE'; // default neutral

  const yearsMatch = expStr.match(/(\d+)\s*(?:\+|-)?\s*year/);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;

  if (years !== null) {
    if (years >= 5) freelancerLevel = 'EXPERT';
    else if (years >= 2) freelancerLevel = 'INTERMEDIATE';
    else freelancerLevel = 'ENTRY';
  } else if (/\b(senior|expert|lead|architect|principal)\b/i.test(expStr)) {
    freelancerLevel = 'EXPERT';
  } else if (/\b(intermediate|mid|experienced)\b/i.test(expStr)) {
    freelancerLevel = 'INTERMEDIATE';
  } else if (/\b(junior|entry|beginner|fresher)\b/i.test(expStr)) {
    freelancerLevel = 'ENTRY';
  }

  const levels = { ENTRY: 1, INTERMEDIATE: 2, EXPERT: 3 };
  const diff = levels[freelancerLevel] - levels[projectReq];

  if (diff >= 0) {
    return {
      experienceScore: 100,
      evaluated: true,
      reason: `Your experience (${freelancerLevel.toLowerCase()}) matches or exceeds project expectations`,
    };
  } else if (diff === -1) {
    return {
      experienceScore: 75,
      evaluated: true,
      reason: `Slight experience gap: project prefers ${projectReq.toLowerCase()} tier`,
    };
  } else {
    return {
      experienceScore: 45,
      evaluated: true,
      reason: `Experience gap: project explicitly seeks ${projectReq.toLowerCase()} level talent`,
    };
  }
}

/**
 * Category Compatibility (10% weight)
 * Compares freelancer's preferred categories with project category.
 */
export function calculateCategoryScore(preferredCategories = [], projectCategory = '') {
  if (!projectCategory) {
    return {
      categoryScore: 80,
      evaluated: false,
      reason: 'General category project',
    };
  }

  const normProjCat = projectCategory.trim().toLowerCase();
  const list = Array.isArray(preferredCategories) ? preferredCategories : [];

  if (list.length === 0) {
    return {
      categoryScore: 80,
      evaluated: false,
      reason: 'Category matches general platform opportunities',
    };
  }

  // Direct match with primary category (top preferred)
  if (list[0] && list[0].trim().toLowerCase() === normProjCat) {
    return {
      categoryScore: 100,
      evaluated: true,
      reason: `Matches your primary focus area (${projectCategory})`,
    };
  }

  // Match with any secondary category
  const hasSecondary = list.some((cat) => cat.trim().toLowerCase() === normProjCat);
  if (hasSecondary) {
    return {
      categoryScore: 85,
      evaluated: true,
      reason: `Matches one of your active project categories (${projectCategory})`,
    };
  }

  // Related technical categories
  return {
    categoryScore: 60,
    evaluated: true,
    reason: `Adjacent discipline to your main categories`,
  };
}

/**
 * Calculates complete SmartMatch recommendation score and breakdown for a project.
 */
export function calculateSmartMatch(freelancerData = {}, project = {}) {
  const {
    skills = [],
    hourlyRate = null,
    avgContractAmount = null,
    experience = '',
    preferredCategories = [],
  } = freelancerData;

  const skillResult = calculateSkillScore(
    skills,
    project.skills,
    project.title,
    project.description
  );

  const budgetResult = calculateBudgetScore(
    hourlyRate,
    avgContractAmount,
    project.budgetMin,
    project.budgetMax
  );

  const experienceResult = calculateExperienceScore(
    experience,
    project.title,
    project.description
  );

  const categoryResult = calculateCategoryScore(
    preferredCategories,
    project.category
  );

  // Formula: (0.60 * Skill) + (0.20 * Budget) + (0.10 * Experience) + (0.10 * Category)
  const rawScore =
    0.6 * skillResult.skillScore +
    0.2 * budgetResult.budgetScore +
    0.1 * experienceResult.experienceScore +
    0.1 * categoryResult.categoryScore;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  const reasons = [];
  if (skillResult.reason) reasons.push(skillResult.reason);
  if (budgetResult.reason) reasons.push(budgetResult.reason);
  if (categoryResult.reason) reasons.push(categoryResult.reason);
  if (experienceResult.reason && experienceResult.evaluated) reasons.push(experienceResult.reason);

  return {
    score: finalScore,
    breakdown: {
      skillScore: skillResult.skillScore,
      budgetScore: budgetResult.budgetScore,
      experienceScore: experienceResult.experienceScore,
      categoryScore: categoryResult.categoryScore,
    },
    matchedSkills: skillResult.matchedSkills,
    missingSkills: skillResult.missingSkills,
    reasons,
  };
}
