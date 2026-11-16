export async function buildTrustScore(prisma, userId, userProfile = {}) {
  const [contracts, rating] = await Promise.all([
    prisma.contract.findMany({
      where: { freelancerId: userId },
      select: { status: true, dueDate: true, completedAt: true },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const completed = contracts.filter((contract) => contract.status === 'COMPLETED');
  const closed = contracts.filter((contract) => ['COMPLETED', 'CANCELLED'].includes(contract.status));
  const onTimeEligible = completed.filter((contract) => contract.dueDate && contract.completedAt);
  const onTime = onTimeEligible.filter((contract) => new Date(contract.completedAt) <= new Date(contract.dueDate)).length;
  const reviewCount = rating._count._all;
  const averageRating = Number(rating._avg.rating || 0);
  const skills = Array.isArray(userProfile.freelancerProfile?.skills) ? userProfile.freelancerProfile.skills : [];

  const profileFields = [
    userProfile.bio,
    userProfile.freelancerProfile?.headline,
    skills.length ? 'skills' : '',
    userProfile.freelancerProfile?.experience,
    userProfile.freelancerProfile?.portfolioUrl,
    userProfile.location,
    userProfile.freelancerProfile?.hourlyRate,
  ];
  const profileCompleteness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const evidence = reviewCount + closed.length;
  if (evidence === 0) {
    return {
      score: null,
      label: 'New freelancer',
      confidence: 'Building history',
      reviewCount,
      completedContracts: completed.length,
      breakdown: {
        averageRating: 0,
        completionRate: null,
        onTimeRate: null,
        profileCompleteness,
      },
    };
  }

  const metrics = [{ value: profileCompleteness, weight: 10 }];
  if (reviewCount > 0) metrics.push({ value: (averageRating / 5) * 100, weight: 40 });
  if (closed.length > 0) metrics.push({ value: (completed.length / closed.length) * 100, weight: 30 });
  if (onTimeEligible.length > 0) metrics.push({ value: (onTime / onTimeEligible.length) * 100, weight: 20 });

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const score = Math.round(metrics.reduce((sum, metric) => sum + metric.value * metric.weight, 0) / totalWeight);
  const confidence = evidence >= 10 ? 'Strong history' : evidence >= 3 ? 'Growing history' : 'Early history';

  return {
    score,
    label: score >= 90 ? 'Excellent' : score >= 80 ? 'Very strong' : score >= 70 ? 'Good' : score >= 60 ? 'Developing' : 'Needs improvement',
    confidence,
    reviewCount,
    completedContracts: completed.length,
    breakdown: {
      averageRating: Number(averageRating.toFixed(1)),
      completionRate: closed.length ? Math.round((completed.length / closed.length) * 100) : null,
      onTimeRate: onTimeEligible.length ? Math.round((onTime / onTimeEligible.length) * 100) : null,
      profileCompleteness,
    },
  };
}
