import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrustScore } from '../src/utils/trustScore.js';

function makePrisma({ contracts = [], averageRating = null, reviewCount = 0 } = {}) {
  return {
    contract: {
      findMany: async () => contracts,
    },
    review: {
      aggregate: async () => ({
        _avg: { rating: averageRating },
        _count: { _all: reviewCount },
      }),
    },
  };
}

test('new freelancers receive no fabricated numeric score', async () => {
  const score = await buildTrustScore(makePrisma(), 'user-1', {
    bio: 'Hello',
    freelancerProfile: { skills: ['React'] },
  });

  assert.equal(score.score, null);
  assert.equal(score.label, 'New freelancer');
  assert.equal(score.reviewCount, 0);
  assert.equal(score.breakdown.completionRate, null);
  assert.equal(score.breakdown.onTimeRate, null);
});

test('score combines rating, closed-contract completion, delivery and profile signals', async () => {
  const prisma = makePrisma({
    contracts: [
      { status: 'COMPLETED', dueDate: new Date('2026-01-10T00:00:00Z'), completedAt: new Date('2026-01-09T00:00:00Z') },
      { status: 'CANCELLED', dueDate: null, completedAt: null },
      { status: 'ACTIVE', dueDate: new Date('2026-02-01T00:00:00Z'), completedAt: null },
    ],
    averageRating: 4.5,
    reviewCount: 2,
  });
  const user = {
    bio: 'Experienced engineer',
    location: 'India',
    freelancerProfile: {
      headline: 'Full-stack developer',
      skills: ['React', 'Node.js'],
      experience: '4 years',
      portfolioUrl: 'https://example.com',
      hourlyRate: 800,
    },
  };

  const score = await buildTrustScore(prisma, 'user-2', user);

  assert.equal(score.score, 81);
  assert.equal(score.breakdown.averageRating, 4.5);
  assert.equal(score.breakdown.completionRate, 50);
  assert.equal(score.breakdown.onTimeRate, 100);
  assert.equal(score.breakdown.profileCompleteness, 100);
});

test('ongoing contracts are not incorrectly counted as cancelled or completed', async () => {
  const score = await buildTrustScore(makePrisma({
    contracts: [{ status: 'ACTIVE', dueDate: null, completedAt: null }],
    averageRating: 5,
    reviewCount: 1,
  }), 'user-3', { freelancerProfile: { skills: [] } });

  assert.equal(score.breakdown.completionRate, null);
  assert.equal(score.breakdown.onTimeRate, null);
  assert.equal(score.breakdown.averageRating, 5);
});

test('missing delivery dates do not fabricate an on-time rate', async () => {
  const score = await buildTrustScore(makePrisma({
    contracts: [{ status: 'COMPLETED', dueDate: null, completedAt: new Date() }],
  }), 'user-4', { freelancerProfile: { skills: [] } });

  assert.equal(score.breakdown.completionRate, 100);
  assert.equal(score.breakdown.onTimeRate, null);
});
