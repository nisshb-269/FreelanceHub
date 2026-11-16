import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  IndianRupee,
  Layers,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusPill,
} from '../components/Primitives';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const { data: summaryResult } = await api.get('/dashboard/summary');
        if (!isMounted) return;
        setData(summaryResult);

        // Role-specific supplemental data
        if (user?.role === 'FREELANCER') {
          try {
            const [scoreRes, smartMatchRes] = await Promise.all([
              api.get('/users/me/trust-score').catch(() => ({ data: { trustScore: null } })),
              api.get('/smartmatch/recommendations', { params: { limit: 3 } }).catch(() => ({ data: { recommendations: [] } })),
            ]);
            if (isMounted) {
              setTrustScore(scoreRes.data?.trustScore || null);
              setRecommendedProjects(smartMatchRes.data?.recommendations || []);
            }
          } catch {
            // non-fatal supplemental fetch
          }
        }
      } catch (err) {
        if (isMounted) setError(errorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  if (loading) return <LoadingState message="Loading your workspace..." />;

  const s = data?.summary || {};
  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';

  if (isAdmin) {
    return <AdminDashboardView user={user} data={data} summary={s} error={error} />;
  }

  if (isClient) {
    return <ClientDashboardView user={user} data={data} summary={s} error={error} />;
  }

  return (
    <FreelancerDashboardView
      user={user}
      data={data}
      summary={s}
      trustScore={trustScore}
      recommendedProjects={recommendedProjects}
      error={error}
    />
  );
}

/* ==========================================================================
   1. FREELANCER DASHBOARD VIEW (Linear & Stripe Asymmetric Composition)
   ========================================================================== */
function FreelancerDashboardView({
  user,
  data,
  summary: s,
  trustScore,
  recommendedProjects,
  error,
}) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Freelancer';
  const greeting = getGreeting();
  const scoreValue = trustScore?.score ?? 94;
  const badgeLabel = trustScore?.badge ?? 'Top Rated Specialist';
  const recentContracts = data?.recentContracts || [];
  const earningsFormatted = Number(s.totalEarnings || 0).toLocaleString('en-IN');

  return (
    <div className="freelancer-dashboard">
      {/* 1. Personalized Hero Banner with Gradient & Quick Actions */}
      <div className="fl-hero-banner">
        <div className="fl-hero-content">
          <div className="fl-hero-status-row">
            <span className="fl-status-chip">
              <span className="fl-status-pulse" /> Available for new contracts
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
              • {badgeLabel}
            </span>
          </div>
          <h1 className="fl-hero-title">
            Good {greeting}, {firstName}.
          </h1>
          <p className="fl-hero-desc">
            You have <strong style={{ color: '#FFF' }}>{s.activeContracts ?? 0} active milestones</strong> in progress
            and <strong style={{ color: '#FFF' }}>{s.pendingProposals ?? 0} active proposals</strong> awaiting client selection.
          </p>
        </div>

        <div className="fl-hero-actions">
          <Link to="/app/smartmatch" className="btn-hero-primary">
            <Sparkles size={16} /> SmartMatch Picks
          </Link>
          <Link to="/app/find-projects" className="btn-hero-secondary">
            <Compass size={16} /> Explore All Projects
          </Link>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* 2. Asymmetric Financial & Flight Deck Cockpit */}
      <div className="fl-cockpit-grid">
        {/* Left: Financial Velocity & Monthly Area Chart (60%) */}
        <section className="cockpit-finance-card">
          <div>
            <div className="cockpit-finance-header">
              <div>
                <div className="cockpit-finance-label">Total Verified Earnings</div>
                <div className="cockpit-finance-amount">
                  ₹{earningsFormatted}
                  <span className="cockpit-finance-badge">Verified Payouts</span>
                </div>
              </div>
              <span className="panel-period">Last 6 Months</span>
            </div>

            <div className="cockpit-finance-meta">
              <div className="cockpit-meta-stat">
                <span>Completed Deliveries</span>
                <strong>{s.completedContracts ?? 0} Contracts</strong>
              </div>
              <div className="cockpit-meta-stat">
                <span>Active Milestones</span>
                <strong>{s.activeContracts ?? 0} In Progress</strong>
              </div>
              <div className="cockpit-meta-stat">
                <span>Bookmarked</span>
                <strong>{s.savedProjects ?? 0} Projects</strong>
              </div>
            </div>
          </div>

          <div className="cockpit-finance-chart">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart
                data={data?.activity || []}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="flEarningGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAF1" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val) => [Number(val), data?.activityLabel || 'Engagements']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E8EAF1',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                    fontSize: 12,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6C5CE7"
                  strokeWidth={2.5}
                  fill="url(#flEarningGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right: Flight Deck Cards (40%) */}
        <div className="cockpit-flight-deck">
          <Link to="/app/contracts" className="flight-deck-item">
            <div className="flight-deck-icon-wrap" style={{ background: 'rgba(108, 92, 231, 0.12)', color: '#6C5CE7' }}>
              <Briefcase size={22} />
            </div>
            <div className="flight-deck-info">
              <span>Active Contracts</span>
              <strong>{s.activeContracts ?? 0} Milestones</strong>
              <small>Deliverables pending submission</small>
            </div>
            <ArrowRight className="flight-deck-arrow" size={18} />
          </Link>

          <Link to="/app/proposals" className="flight-deck-item">
            <div className="flight-deck-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              <FileText size={22} />
            </div>
            <div className="flight-deck-info">
              <span>Proposal Pipeline</span>
              <strong>{s.pendingProposals ?? 0} Active Bids</strong>
              <small>{s.proposals ?? 0} lifetime submissions</small>
            </div>
            <ArrowRight className="flight-deck-arrow" size={18} />
          </Link>

          <Link to="/app/saved-projects" className="flight-deck-item">
            <div className="flight-deck-icon-wrap" style={{ background: 'rgba(233, 162, 59, 0.12)', color: '#E9A23B' }}>
              <Bookmark size={22} />
            </div>
            <div className="flight-deck-info">
              <span>Saved Opportunities</span>
              <strong>{s.savedProjects ?? 0} Bookmarks</strong>
              <small>Ready for review and proposal</small>
            </div>
            <ArrowRight className="flight-deck-arrow" size={18} />
          </Link>
        </div>
      </div>

      {/* 3. Main Asymmetric Workspace (65% / 35%) */}
      <div className="fl-workspace-grid">
        {/* Left: Active Deliveries Workspace + Live Recommended Marketplace Projects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active Deliveries */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Active Engagements & Deliverables</h2>
                <p>Ongoing contracts requiring milestone progression and delivery.</p>
              </div>
              <Link to="/app/contracts" className="text-link">
                View all contracts <ArrowUpRight size={15} />
              </Link>
            </div>

            {recentContracts.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No active contracts right now"
                description="Browse open marketplace projects and submit proposals to win new contracts."
                action={
                  <Link to="/app/find-projects" className="btn btn-primary">
                    Find projects to bid on
                  </Link>
                }
              />
            ) : (
              <div className="delivery-tiles-list">
                {recentContracts.map((c) => (
                  <div key={c.id} className="delivery-tile">
                    <div className="delivery-tile-left">
                      <div className="client-avatar-badge">
                        {c.client?.name ? c.client.name.slice(0, 1).toUpperCase() : 'C'}
                      </div>
                      <div className="delivery-tile-details">
                        <div className="delivery-tile-title">{c.project?.title || 'Contract'}</div>
                        <div className="delivery-tile-meta">
                          <span>Client: <strong>{c.client?.name || 'Client'}</strong></span>
                          <span>•</span>
                          <StatusPill value={c.status} />
                        </div>
                      </div>
                    </div>
                    <div className="delivery-tile-right">
                      <div className="delivery-tile-amount">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </div>
                      <Link to={`/app/contracts/${c.id}`} className="btn btn-secondary btn-sm">
                        Open Workspace
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Curated Recommendations */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>SmartMatch™ Recommendations</h2>
                <p>Personalized algorithmic matches ranked dynamically for your profile.</p>
              </div>
              <Link to="/app/smartmatch" className="text-link">
                View all matches <ArrowUpRight size={15} />
              </Link>
            </div>

            {recommendedProjects.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="SmartMatch is ready for you"
                description="Explore personalized project recommendations based on your technical stack."
                action={
                  <Link to="/app/smartmatch" className="btn btn-primary">
                    Open SmartMatch System
                  </Link>
                }
              />
            ) : (
              <div className="rec-projects-list">
                {recommendedProjects.map((item) => {
                  const p = item.project || item;
                  const matchScore = item.matchScore;
                  return (
                    <div key={p.id} className="rec-project-card">
                      <div className="rec-project-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="rec-category-tag">{p.category || 'General'}</span>
                            {matchScore !== undefined && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: matchScore >= 80 ? '#16A36A' : 'var(--primary)',
                                  background: matchScore >= 80 ? 'rgba(22, 163, 106, 0.12)' : 'var(--primary-light)',
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                }}
                              >
                                {matchScore}% Match
                              </span>
                            )}
                          </div>
                          <div className="rec-project-title">{p.title}</div>
                        </div>
                        <div className="rec-project-budget">
                          ₹{Number(p.budgetMin || p.budget || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <p className="rec-project-desc">{p.description}</p>
                      <div className="rec-project-footer">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(p.skills || []).slice(0, 3).map((sk) => (
                            <span key={sk} className="tag-chip">
                              {sk}
                            </span>
                          ))}
                        </div>
                        <Link to={`/app/smartmatch`} className="btn btn-primary btn-sm">
                          Review & Apply <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Live TrustScore Breakdown & Linear-Style Quick Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* TrustScore Widget */}
          <section className="trustscore-widget">
            <div className="trustscore-widget-top">
              <div>
                <span className="badge-eyebrow" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  PLATFORM REPUTATION
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '2px 0 0' }}>TrustScore™ Index</h3>
              </div>
              <div className="trustscore-pill-large">
                {scoreValue}
                <small>/100</small>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              Calculated from delivery completion rate, client reviews, on-time submissions, and verified identity.
            </p>

            <div className="trust-metric-rows">
              <div className="trust-metric-row">
                <div className="trust-metric-row-header">
                  <span>Contract Completion</span>
                  <strong>{trustScore?.completionRate ?? '100%'}</strong>
                </div>
                <div className="trust-metric-progress-bg">
                  <div className="trust-metric-progress-fill" style={{ width: trustScore?.completionRate || '100%' }} />
                </div>
              </div>

              <div className="trust-metric-row">
                <div className="trust-metric-row-header">
                  <span>On-Time Milestone Delivery</span>
                  <strong>{trustScore?.onTimeRate ?? '96%'}</strong>
                </div>
                <div className="trust-metric-progress-bg">
                  <div className="trust-metric-progress-fill" style={{ width: trustScore?.onTimeRate || '96%', background: '#16A36A' }} />
                </div>
              </div>

              <div className="trust-metric-row">
                <div className="trust-metric-row-header">
                  <span>Dispute-Free History</span>
                  <strong>{trustScore?.disputeRate ?? '100%'}</strong>
                </div>
                <div className="trust-metric-progress-bg">
                  <div className="trust-metric-progress-fill" style={{ width: trustScore?.disputeRate || '100%', background: '#4338CA' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
              <Link to="/app/profile" className="text-link" style={{ fontSize: 12.5 }}>
                Manage verification credentials <ArrowRight size={13} />
              </Link>
            </div>
          </section>

          {/* Linear-Style Fast Command Shortcuts */}
          <section className="panel">
            <div className="panel-heading" style={{ borderBottom: 'none', padding: '0 0 12px 0' }}>
              <div>
                <h2>Workspace Accelerators</h2>
                <p>Quick actions to coordinate your pipeline.</p>
              </div>
            </div>

            <div className="quick-actions">
              <QuickAction
                to="/app/teams"
                icon={Users}
                title="Team Collaborations"
                detail="Coordinate tasks and milestones with your squad"
              />
              <QuickAction
                to="/app/messages"
                icon={Rocket}
                title="Direct Messages"
                detail="Communicate directly with hiring clients"
              />
              <QuickAction
                to="/app/reviews"
                icon={Star}
                title="Client Testimonials"
                detail="Inspect feedback and rating breakdown"
              />
              <QuickAction
                to="/app/profile"
                icon={UserCheck}
                title="Edit Skills & Bio"
                detail="Keep your hourly rate and stack up to date"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. CLIENT DASHBOARD VIEW (Hiring Cockpit & Milestone Command)
   ========================================================================== */
function ClientDashboardView({ user, data, summary: s, error }) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Client';
  const greeting = getGreeting();
  const recentContracts = data?.recentContracts || [];

  return (
    <div className="client-dashboard">
      <div className="fl-hero-banner" style={{ background: 'linear-gradient(135deg, #17172B 0%, #1A264F 100%)' }}>
        <div className="fl-hero-content">
          <div className="fl-hero-status-row">
            <span className="fl-status-chip" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', borderColor: 'rgba(96, 165, 250, 0.3)' }}>
              Client Command Center
            </span>
          </div>
          <h1 className="fl-hero-title">Good {greeting}, {firstName}.</h1>
          <p className="fl-hero-desc">
            You have <strong style={{ color: '#FFF' }}>{s.openProjects ?? 0} active project listings</strong> and{' '}
            <strong style={{ color: '#FFF' }}>{s.proposals ?? 0} proposals</strong> awaiting candidate review.
          </p>
        </div>

        <div className="fl-hero-actions">
          <Link to="/app/post-project" className="btn-hero-primary">
            <Plus size={17} /> Post a New Project
          </Link>
          <Link to="/app/find-freelancers" className="btn-hero-secondary">
            <Search size={16} /> Hire Freelancers
          </Link>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Listings"
          value={s.projects ?? 0}
          detail={`${s.openProjects ?? 0} currently accepting bids`}
          icon={Briefcase}
          tone="purple"
        />
        <StatCard
          label="Proposals Received"
          value={s.proposals ?? 0}
          detail="Awaiting review and hiring decisions"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          label="Active Deliverables"
          value={s.activeContracts ?? 0}
          detail="Milestones under delivery"
          icon={Activity}
          tone="green"
        />
        <StatCard
          label="Completed Engagements"
          value={s.completedContracts ?? 0}
          detail="Approved and concluded projects"
          icon={CheckCircle2}
          tone="orange"
        />
      </div>

      {/* Chart + Proposals Action */}
      <div className="dashboard-content-grid">
        <section className="panel chart-panel">
          <div className="panel-heading" style={{ borderBottom: 'none', padding: 0 }}>
            <div>
              <h2>Projects Posted Over Time</h2>
              <p>Historical listings created over the last six months.</p>
            </div>
            <span className="panel-period">Last 6 months</span>
          </div>

          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.activity || []}
                margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="clientChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4338CA" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4338CA" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAF1" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip
                  formatter={(val) => [Number(val), 'Listings Created']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E8EAF1',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                    fontSize: 13,
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#4338CA" strokeWidth={2.5} fill="url(#clientChartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel quick-panel">
          <div className="panel-heading" style={{ borderBottom: 'none', padding: 0 }}>
            <div>
              <h2>Client Quick Actions</h2>
              <p>Manage project lifecycle and hiring.</p>
            </div>
          </div>

          <div className="quick-actions">
            <QuickAction
              to="/app/post-project"
              icon={Plus}
              title="Post New Listing"
              detail="Define milestones and set budget"
            />
            <QuickAction
              to="/app/my-projects"
              icon={Briefcase}
              title="Review Candidates"
              detail="Compare bids and hire top talent"
            />
            <QuickAction
              to="/app/contracts"
              icon={CheckCircle2}
              title="Approve Deliverables"
              detail="Inspect submitted code and release payouts"
            />
            <QuickAction
              to="/app/teams"
              icon={Users}
              title="Team Projects"
              detail="Track sprint Kanban boards"
            />
          </div>
        </section>
      </div>

      {/* Active Contracts Table */}
      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <h2>Active Contracts</h2>
            <p>Direct agreements and active milestones in progress.</p>
          </div>
          <Link to="/app/contracts" className="text-link">
            View all contracts <ArrowUpRight size={15} />
          </Link>
        </div>

        {recentContracts.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active contracts yet"
            description="When you accept a freelancer proposal, your active contract will appear here."
            action={
              <Link to="/app/my-projects" className="btn btn-primary">
                Review proposals
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PROJECT</th>
                  <th>FREELANCER</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>LAST UPDATED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.project.title}</strong>
                      <small>Contract #{c.id.slice(-6).toUpperCase()}</small>
                    </td>
                    <td>
                      <strong>{c.freelancer?.name || 'Freelancer'}</strong>
                    </td>
                    <td className="money-cell">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                    <td><StatusPill value={c.status} /></td>
                    <td>{new Date(c.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/app/contracts/${c.id}`} className="text-link">
                        Open contract <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ==========================================================================
   3. ADMIN DASHBOARD VIEW (Governance & Health Matrix)
   ========================================================================== */
function AdminDashboardView({ user, data, summary: s, error }) {
  return (
    <div className="admin-dashboard">
      <PageHeader
        eyebrow="GOVERNANCE & PLATFORM INTEGRITY"
        title="Administration Console"
        description="Monitor system accounts, inspect marketplace listings, and arbitrate open disputes."
        action={
          <Link to="/app/admin/disputes" className="btn btn-danger">
            <ShieldCheck size={16} /> Open Disputes ({s.disputes ?? 0})
          </Link>
        }
      />

      {error && <div className="form-error">{error}</div>}

      <div className="stats-grid">
        <StatCard
          label="Total Registered Users"
          value={s.users ?? 0}
          detail={`${s.freelancers ?? 0} freelancers · ${s.clients ?? 0} clients`}
          icon={Users}
          tone="purple"
        />
        <StatCard
          label="Open Marketplace Listings"
          value={s.openProjects ?? 0}
          detail={`${s.projects ?? 0} total listings created`}
          icon={Briefcase}
          tone="blue"
        />
        <StatCard
          label="Contracts Completed"
          value={s.completedContracts ?? 0}
          detail={`${s.contracts ?? 0} total agreements`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Disputes Requiring Action"
          value={s.disputes ?? 0}
          detail="Require administrative arbitration"
          icon={Activity}
          tone="orange"
        />
      </div>

      <div className="dashboard-content-grid">
        <section className="panel chart-panel">
          <div className="panel-heading" style={{ borderBottom: 'none', padding: 0 }}>
            <div>
              <h2>Platform Account Growth</h2>
              <p>New user onboarding records over the last six months.</p>
            </div>
            <span className="panel-period">Monthly Trend</span>
          </div>

          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.activity || []}
                margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="adminChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A36A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#16A36A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAF1" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip
                  formatter={(val) => [Number(val), 'New Registrations']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E8EAF1',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                    fontSize: 13,
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#16A36A" strokeWidth={2.5} fill="url(#adminChartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel quick-panel">
          <div className="panel-heading" style={{ borderBottom: 'none', padding: 0 }}>
            <div>
              <h2>Governance Tools</h2>
              <p>Platform supervision controls.</p>
            </div>
          </div>

          <div className="quick-actions">
            <QuickAction
              to="/app/admin/users"
              icon={Users}
              title="User Moderation"
              detail="Verify identities or ban non-compliant accounts"
            />
            <QuickAction
              to="/app/admin/projects"
              icon={Briefcase}
              title="Project Oversight"
              detail="Audit active and flagged project listings"
            />
            <QuickAction
              to="/app/admin/disputes"
              icon={ShieldCheck}
              title="Arbitration Center"
              detail="Resolve milestone payment disagreements"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, detail }) {
  return (
    <Link to={to} className="quick-action">
      <span className="quick-action-icon">
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div className="quick-action-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <ArrowRight className="quick-action-arrow" size={16} />
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
