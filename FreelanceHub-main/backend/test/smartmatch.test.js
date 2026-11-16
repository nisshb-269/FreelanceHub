import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSkill,
  calculateSkillScore,
  calculateBudgetScore,
  calculateExperienceScore,
  calculateCategoryScore,
  calculateSmartMatch,
} from '../src/utils/smartMatch.js';

describe('SmartMatch Engine Unit Tests', () => {
  it('normalizes skills with whitespace and case differences correctly', () => {
    assert.equal(normalizeSkill('  React.js  '), 'react.js');
    assert.equal(normalizeSkill('NODE.JS '), 'node.js');
    assert.equal(normalizeSkill('TypeScript   FullStack'), 'typescript fullstack');
    assert.equal(normalizeSkill(null), '');
  });

  it('calculates skill compatibility accurately with partial and full matches', () => {
    const freelancerSkills = ['React', 'Node.js', 'PostgreSQL', 'TypeScript'];
    const projectSkills = ['react', 'node.js', 'docker', 'kubernetes'];

    const res = calculateSkillScore(freelancerSkills, projectSkills);
    assert.equal(res.skillScore, 50); // 2 of 4 matched
    assert.deepEqual(res.matchedSkills, ['react', 'node.js']);
    assert.deepEqual(res.missingSkills, ['docker', 'kubernetes']);
  });

  it('assigns 100% skill score when all required skills are possessed', () => {
    const freelancerSkills = ['React', 'TypeScript', 'Tailwind CSS'];
    const projectSkills = ['react', 'typescript'];

    const res = calculateSkillScore(freelancerSkills, projectSkills);
    assert.equal(res.skillScore, 100);
    assert.equal(res.missingSkills.length, 0);
  });

  it('handles projects without explicit skill tags gracefully', () => {
    const freelancerSkills = ['Python', 'Django'];
    const res = calculateSkillScore(
      freelancerSkills,
      [],
      'Build Python Django API',
      'Need an API written in Python using Django framework.'
    );
    assert.ok(res.skillScore >= 80);
    assert.ok(res.matchedSkills.includes('Python') || res.matchedSkills.includes('Django'));
  });

  it('verifies that projects with higher skill compatibility receive higher scores when other factors are equal', () => {
    const freelancer = {
      skills: ['React', 'Node.js', 'PostgreSQL'],
      hourlyRate: 1000,
      experience: '4 years',
      preferredCategories: ['Development & IT'],
    };

    const projectHighMatch = {
      title: 'Full Stack App',
      description: 'Need full stack developer',
      category: 'Development & IT',
      skills: ['React', 'Node.js', 'PostgreSQL'], // 3 of 3 matched (100%)
      budgetMin: 35000,
      budgetMax: 50000,
    };

    const projectLowMatch = {
      title: 'Mobile App',
      description: 'Need mobile developer',
      category: 'Development & IT',
      skills: ['React', 'Swift', 'Kotlin'], // 1 of 3 matched (33%)
      budgetMin: 35000,
      budgetMax: 50000,
    };

    const scoreHigh = calculateSmartMatch(freelancer, projectHighMatch);
    const scoreLow = calculateSmartMatch(freelancer, projectLowMatch);

    assert.ok(
      scoreHigh.score > scoreLow.score,
      `Expected ${scoreHigh.score} to be strictly greater than ${scoreLow.score}`
    );
    assert.ok(scoreHigh.score >= 90);
    assert.ok(scoreLow.score <= 70);
  });

  it('evaluates budget compatibility using implied project value from hourly rate', () => {
    // ₹1000/hr * 40h = ~₹40,000 expected baseline
    const resGood = calculateBudgetScore(1000, null, 30000, 50000);
    assert.ok(resGood.budgetScore >= 95);

    // Significantly low budget (e.g. ₹5,000 for a ₹1000/hr freelancer)
    const resLow = calculateBudgetScore(1000, null, 3000, 5000);
    assert.ok(resLow.budgetScore <= 55);
  });

  it('does not penalize freelancer when project does not specify an experience requirement', () => {
    const res = calculateExperienceScore('1 year', 'Simple landing page', 'Please build a landing page for us.');
    assert.equal(res.experienceScore, 100);
  });

  it('awards 100% category compatibility when project matches primary preferred category', () => {
    const res = calculateCategoryScore(['Development & IT', 'Design & Creative'], 'Development & IT');
    assert.equal(res.categoryScore, 100);
  });

  it('ensures SmartMatch score is always clamped between 0 and 100', () => {
    const freelancerNoSkills = { skills: [], hourlyRate: 0, experience: '', preferredCategories: [] };
    const project = { title: 'Random', description: 'Desc', category: 'Other', skills: ['Rust', 'Solidity'], budgetMin: 100, budgetMax: 200 };

    const result = calculateSmartMatch(freelancerNoSkills, project);
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it('correctly ranks multiple candidate projects by matching score descending', () => {
    const freelancer = {
      skills: ['Figma', 'UI/UX', 'Design Systems', 'CSS'],
      hourlyRate: 1200,
      experience: '5 years',
      preferredCategories: ['Design & Creative'],
    };

    const projectDesign = {
      id: 'p1',
      title: 'Design Complete SaaS Design System',
      description: 'Looking for senior designer to build design system in Figma',
      category: 'Design & Creative',
      skills: ['Figma', 'UI/UX', 'Design Systems'],
      budgetMin: 40000,
      budgetMax: 60000,
    };

    const projectDev = {
      id: 'p2',
      title: 'Python Backend Microservice',
      description: 'Looking for Python Docker expert',
      category: 'Development & IT',
      skills: ['Python', 'Docker', 'FastAPI'],
      budgetMin: 15000,
      budgetMax: 25000,
    };

    const matchDesign = calculateSmartMatch(freelancer, projectDesign);
    const matchDev = calculateSmartMatch(freelancer, projectDev);

    const candidates = [
      { project: projectDev, matchScore: matchDev.score },
      { project: projectDesign, matchScore: matchDesign.score },
    ].sort((a, b) => b.matchScore - a.matchScore);

    assert.equal(candidates[0].project.id, 'p1');
    assert.ok(candidates[0].matchScore >= 90);
    assert.ok(candidates[1].matchScore < 60);
  });
});
