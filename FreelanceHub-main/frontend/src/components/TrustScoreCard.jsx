import { ShieldCheck, Award } from 'lucide-react';

export default function TrustScoreCard({ trustScore, compact = false }) {
  if (!trustScore) return null;
  const score = trustScore.score;

  const metrics = [
    {
      label: 'Client rating',
      value: trustScore.breakdown?.averageRating
        ? `${trustScore.breakdown.averageRating.toFixed(1)} / 5.0`
        : 'No reviews yet',
    },
    {
      label: 'Contract completion',
      value:
        trustScore.breakdown?.completionRate == null
          ? 'Not enough data'
          : `${trustScore.breakdown.completionRate}%`,
    },
    {
      label: 'On-time delivery',
      value:
        trustScore.breakdown?.onTimeRate == null
          ? 'Not enough data'
          : `${trustScore.breakdown.onTimeRate}%`,
    },
    {
      label: 'Profile completeness',
      value: `${trustScore.breakdown?.profileCompleteness ?? 0}%`,
    },
  ];

  return (
    <section className={`trust-score-card ${compact ? 'trust-score-compact' : ''}`}>
      <div className="trust-score-top">
        <div>
          <span className="trust-score-eyebrow">
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
            FREELANCEHUB TRUSTSCORE
          </span>
          <h3>{trustScore.label}</h3>
          <p>
            {score == null
              ? 'Complete projects and collect client reviews to build your reputation.'
              : trustScore.confidence}
          </p>
        </div>
        <div className={`trust-score-number ${score == null ? 'trust-score-new' : ''}`}>
          <strong>{score == null ? '—' : score}</strong>
          <span>{score == null ? 'NEW' : '/ 100'}</span>
        </div>
      </div>

      {score != null && (
        <div className="trust-score-track" role="progressbar" aria-valuenow={score} aria-valuemin="0" aria-valuemax="100">
          <span style={{ width: `${score}%` }} />
        </div>
      )}

      {!compact && (
        <div className="trust-score-metrics">
          {metrics.map((metric) => (
            <div className="trust-score-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      )}

      <p className="trust-score-note">
        Calculated from platform activity and completed-contract feedback. New accounts are not penalized for having no history.
      </p>
    </section>
  );
}
