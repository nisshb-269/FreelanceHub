import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  MapPin,
  Minus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, EmptyState, Modal } from '../components/Primitives';

const categoryOptions = [
  'All categories',
  'Development & IT',
  'Design & Creative',
  'Writing & Content',
  'Business & Consulting',
  'Marketing',
  'Video & Animation',
  'Data & Analytics',
  'Other',
];

const scoreThresholds = [
  { label: 'All Matches', value: '0' },
  { label: 'Top Tier (80%+)', value: '80' },
  { label: 'Strong Fit (70%+)', value: '70' },
  { label: 'Good Fit (60%+)', value: '60' },
];

export default function SmartMatchPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All categories');
  const [minScore, setMinScore] = useState('0');

  // Modals
  const [detailsProject, setDetailsProject] = useState(null);
  const [applyProject, setApplyProject] = useState(null);
  const [proposal, setProposal] = useState({
    coverLetter: '',
    bidAmount: '',
    deliveryDays: '14',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState('');

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/smartmatch/recommendations', {
        params: {
          category: category === 'All categories' ? undefined : category,
          minScore: minScore !== '0' ? minScore : undefined,
          limit: 25,
        },
      });
      setRecommendations(data.recommendations || []);
      setProfileSummary(data.profileSummary || null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [category, minScore]);

  const handleApplyClick = (project) => {
    setApplyProject(project);
    setProposal({
      coverLetter: '',
      bidAmount: String(project.budgetMin || ''),
      deliveryDays: '14',
    });
    setFeedbackNotice('');
  };

  const submitProposal = async (e) => {
    e.preventDefault();
    if (!applyProject) return;
    setSubmitting(true);
    setFeedbackNotice('');

    try {
      await api.post(`/proposals/project/${applyProject.id}`, {
        coverLetter: proposal.coverLetter,
        bidAmount: Number(proposal.bidAmount),
        deliveryDays: Number(proposal.deliveryDays),
      });

      setFeedbackNotice(`Proposal submitted successfully for "${applyProject.title}".`);
      setApplyProject(null);
      // Reload recommendations so applied project is excluded
      loadRecommendations();
    } catch (err) {
      setFeedbackNotice(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isProfileIncomplete = profileSummary && (!profileSummary.hasSkills || !profileSummary.hasHourlyRate);

  return (
    <div className="smartmatch-page">
      {/* 1. Branded Hero Header */}
      <section className="smartmatch-hero">
        <div className="smartmatch-hero-content">
          <div className="smartmatch-badge">
            <Sparkles size={14} /> INTELLIGENT RECOMMENDATION SYSTEM
          </div>
          <h1 className="smartmatch-hero-title">SmartMatch – Projects Picked for You</h1>
          <p className="smartmatch-hero-desc">
            Personalized algorithmic recommendations ranked dynamically by Skill Compatibility (60%),
            Budget Alignment (20%), Experience Tier (10%), and Domain Category (10%).
          </p>
        </div>

        <div className="smartmatch-hero-stats">
          <div className="smartmatch-hero-stat-chip">
            <strong>{recommendations.length}</strong>
            <small>Matched Projects</small>
          </div>
          <div className="smartmatch-hero-stat-chip">
            <strong>
              {recommendations.length > 0
                ? `${recommendations[0].matchScore}%`
                : '--'}
            </strong>
            <small>Top Score</small>
          </div>
        </div>
      </section>

      {/* 2. Profile Incomplete Alert */}
      {isProfileIncomplete && (
        <div className="profile-incomplete-alert">
          <div className="profile-incomplete-alert-left">
            <div className="profile-incomplete-icon">
              <AlertCircle size={20} />
            </div>
            <div className="profile-incomplete-text">
              <strong>Your profile needs skills or rate details for optimal matching</strong>
              <p>
                Add your technical skills and hourly rate to your profile to let the SmartMatch algorithm
                accurately compute your compatibility scores.
              </p>
            </div>
          </div>
          <Link to="/app/profile" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            <UserCheck size={15} /> Update Profile
          </Link>
        </div>
      )}

      {/* 3. Feedback notification banner if proposal submitted */}
      {feedbackNotice && (
        <div className="form-success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} /> {feedbackNotice}
        </div>
      )}

      {/* 4. Controls & Filters Bar */}
      <div className="smartmatch-controls-bar">
        <div className="smartmatch-filters">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {scoreThresholds.map((tier) => (
              <button
                key={tier.value}
                type="button"
                className={`btn btn-sm ${minScore === tier.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMinScore(tier.value)}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadRecommendations}
          disabled={loading}
          icon={RefreshCw}
        >
          Refresh Matches
        </Button>
      </div>

      {/* 5. Error State */}
      {error && (
        <div className="panel" style={{ padding: 30, textAlign: 'center', marginBottom: 24 }}>
          <AlertCircle size={32} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Failed to load recommendations</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{error}</p>
          <Button variant="primary" onClick={loadRecommendations}>
            Retry Calculation
          </Button>
        </div>
      )}

      {/* 6. Loading Skeletons */}
      {loading && !error && (
        <div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer" style={{ width: '25%', height: 16, marginBottom: 10 }} />
                  <div className="skeleton-shimmer" style={{ width: '60%', height: 24, marginBottom: 12 }} />
                  <div className="skeleton-shimmer" style={{ width: '90%', height: 16 }} />
                </div>
                <div className="skeleton-shimmer" style={{ width: 84, height: 70, borderRadius: 10 }} />
              </div>
              <div className="skeleton-shimmer" style={{ width: '100%', height: 48, borderRadius: 8 }} />
              <div className="skeleton-shimmer" style={{ width: '40%', height: 20 }} />
            </div>
          ))}
        </div>
      )}

      {/* 7. Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <EmptyState
            icon={Sparkles}
            title="No matching projects found"
            description="We couldn't find any open projects matching your current score threshold or category filter."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setCategory('All categories');
                  setMinScore('0');
                }}
              >
                Reset All Filters
              </Button>
            }
          />
        </div>
      )}

      {/* 8. Recommendations List */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="smartmatch-list">
          {recommendations.map(({ project, matchScore, breakdown, matchedSkills, missingSkills, matchReasons }) => {
            const scoreClass =
              matchScore >= 80 ? 'match-high' : matchScore >= 65 ? 'match-medium' : 'match-moderate';

            return (
              <article key={project.id} className="smartmatch-card">
                {/* Top Section */}
                <div className="smartmatch-card-top">
                  <div className="smartmatch-card-main">
                    <div className="smartmatch-card-meta">
                      <span className="rec-category-tag">{project.category}</span>
                      {project.client?.isVerified && (
                        <span className="verified-badge" style={{ fontSize: 11 }}>
                          <ShieldCheck size={12} /> Verified Client
                        </span>
                      )}
                      {project.client?.location && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={12} /> {project.client.location}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Client: <strong>{project.client?.name || 'Client'}</strong>
                      </span>
                    </div>

                    <h2 className="smartmatch-card-title">{project.title}</h2>
                    <p className="smartmatch-card-desc">{project.description}</p>
                  </div>

                  {/* Score Pill Badge */}
                  <div className={`match-score-badge ${scoreClass}`}>
                    <div className="match-score-number">{matchScore}%</div>
                    <div className="match-score-label">SmartMatch</div>
                  </div>
                </div>

                {/* Weighted Compatibility Breakdown (60% Skill, 20% Budget, 10% Exp, 10% Cat) */}
                <div className="score-breakdown-grid">
                  <div className="score-breakdown-item">
                    <div className="score-breakdown-label">
                      <span>Skills (60%)</span>
                      <strong>{breakdown.skillScore}%</strong>
                    </div>
                    <div className="score-metric-bar">
                      <div
                        className="score-metric-bar-fill"
                        style={{ width: `${breakdown.skillScore}%`, background: '#6C5CE7' }}
                      />
                    </div>
                  </div>

                  <div className="score-breakdown-item">
                    <div className="score-breakdown-label">
                      <span>Budget (20%)</span>
                      <strong>{breakdown.budgetScore}%</strong>
                    </div>
                    <div className="score-metric-bar">
                      <div
                        className="score-metric-bar-fill"
                        style={{ width: `${breakdown.budgetScore}%`, background: '#16A36A' }}
                      />
                    </div>
                  </div>

                  <div className="score-breakdown-item">
                    <div className="score-breakdown-label">
                      <span>Experience (10%)</span>
                      <strong>{breakdown.experienceScore}%</strong>
                    </div>
                    <div className="score-metric-bar">
                      <div
                        className="score-metric-bar-fill"
                        style={{ width: `${breakdown.experienceScore}%`, background: '#3B82F6' }}
                      />
                    </div>
                  </div>

                  <div className="score-breakdown-item">
                    <div className="score-breakdown-label">
                      <span>Category (10%)</span>
                      <strong>{breakdown.categoryScore}%</strong>
                    </div>
                    <div className="score-metric-bar">
                      <div
                        className="score-metric-bar-fill"
                        style={{ width: `${breakdown.categoryScore}%`, background: '#E9A23B' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Skills Analysis */}
                <div className="skills-comparison-row">
                  {matchedSkills.length > 0 && (
                    <div className="skills-comparison-group">
                      <span className="skills-group-title">Matched Skills:</span>
                      {matchedSkills.map((sk) => (
                        <span key={sk} className="skill-pill-matched">
                          <Check size={12} strokeWidth={2.5} /> {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {missingSkills.length > 0 && (
                    <div className="skills-comparison-group">
                      <span className="skills-group-title">Missing Skills:</span>
                      {missingSkills.map((sk) => (
                        <span key={sk} className="skill-pill-missing">
                          <Minus size={11} /> {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Match Insights Chips */}
                {matchReasons.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {matchReasons.map((r, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11.5,
                          color: 'var(--text-muted)',
                          background: 'rgba(0,0,0,0.03)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        • {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Bar */}
                <div className="smartmatch-card-footer">
                  <div className="smartmatch-footer-meta">
                    <div>
                      Budget: <strong>₹{Number(project.budgetMin).toLocaleString('en-IN')} – ₹{Number(project.budgetMax).toLocaleString('en-IN')}</strong>
                    </div>
                    <span>•</span>
                    <div>
                      Proposals: <strong>{project._count?.proposals || 0}</strong>
                    </div>
                    {project.deadline && (
                      <>
                        <span>•</span>
                        <div>
                          Deadline: <strong>{new Date(project.deadline).toLocaleDateString()}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="smartmatch-card-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDetailsProject(project)}
                    >
                      <Eye size={14} /> View Details
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApplyClick(project)}
                    >
                      <Send size={14} /> Submit Proposal
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Project Details Modal */}
      <Modal
        isOpen={Boolean(detailsProject)}
        onClose={() => setDetailsProject(null)}
        title={detailsProject?.title || 'Project Scope Details'}
        subtitle={`Category: ${detailsProject?.category || 'General'}`}
      >
        {detailsProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="two-fields">
              <div className="form-field">
                <span>Budget Range</span>
                <strong style={{ fontSize: 16, color: 'var(--success)' }}>
                  ₹{Number(detailsProject.budgetMin).toLocaleString('en-IN')} – ₹{Number(detailsProject.budgetMax).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="form-field">
                <span>Client</span>
                <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                  {detailsProject.client?.name || 'Client'}
                </strong>
              </div>
            </div>

            <div className="form-field">
              <span>Full Description</span>
              <div
                style={{
                  background: 'var(--bg-page)',
                  padding: 14,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {detailsProject.description}
              </div>
            </div>

            <div className="form-field">
              <span>Required Technology Stack</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {(detailsProject.skills || []).map((sk) => (
                  <span key={sk} className="tag-chip">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Button variant="secondary" onClick={() => setDetailsProject(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const target = detailsProject;
                  setDetailsProject(null);
                  handleApplyClick(target);
                }}
              >
                Apply for this Project <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Proposal Submission Modal */}
      <Modal
        isOpen={Boolean(applyProject)}
        onClose={() => setApplyProject(null)}
        title={`Apply for: ${applyProject?.title}`}
        subtitle="Pitch your expertise, specify your milestone quote, and outline delivery timeline."
      >
        <form onSubmit={submitProposal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="two-fields">
            <div className="form-field">
              <span>Your Bid Amount (₹) *</span>
              <input
                type="number"
                value={proposal.bidAmount}
                onChange={(e) => setProposal({ ...proposal, bidAmount: e.target.value })}
                required
                min={1}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="form-field">
              <span>Estimated Delivery (Days) *</span>
              <input
                type="number"
                value={proposal.deliveryDays}
                onChange={(e) => setProposal({ ...proposal, deliveryDays: e.target.value })}
                required
                min={1}
                max={365}
                placeholder="e.g. 14"
              />
            </div>
          </div>

          <div className="form-field">
            <span>Cover Letter & Approach *</span>
            <textarea
              rows={5}
              value={proposal.coverLetter}
              onChange={(e) => setProposal({ ...proposal, coverLetter: e.target.value })}
              required
              minLength={30}
              maxLength={4000}
              placeholder="Explain how your skills align with this project, your proposed architecture, and milestones..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setApplyProject(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} size="lg">
              Submit Proposal <Send size={15} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
