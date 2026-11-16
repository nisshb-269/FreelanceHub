import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Briefcase,
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  IndianRupee,
  Search,
  Send,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchField,
  StatusPill,
  Modal,
} from '../components/Primitives';

const categories = [
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

export default function ExploreProjectsPage({ publicMode = false }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState('newest');
  const [skill, setSkill] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Proposal modal state
  const [selected, setSelected] = useState(null);
  const [proposal, setProposal] = useState({
    coverLetter: '',
    bidAmount: '',
    deliveryDays: '14',
  });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  // Bookmarked projects
  const [savedIds, setSavedIds] = useState([]);
  const [savingId, setSavingId] = useState('');

  // Project details modal
  const [detailsProject, setDetailsProject] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/projects', {
        params: {
          q: query.trim() || undefined,
          category: category === 'All categories' ? undefined : category,
          skill: skill.trim() || undefined,
          minBudget: minBudget || undefined,
          maxBudget: maxBudget || undefined,
          sort,
        },
      });
      setItems(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [category, sort]);

  useEffect(() => {
    if (user?.role === 'FREELANCER') {
      api
        .get('/projects/saved')
        .then(({ data }) => setSavedIds(data.items.map((i) => i.projectId)))
        .catch(() => {});
    }
  }, [user?.role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProjects();
  };

  const toggleSave = async (projectId) => {
    setSavingId(projectId);
    setNotice('');
    try {
      const { data } = await api.post(`/projects/${projectId}/save`);
      setSavedIds((curr) =>
        data.saved ? [...curr, projectId] : curr.filter((id) => id !== projectId)
      );
      setNotice(
        data.saved
          ? 'Project shortlisted to your saved list.'
          : 'Project removed from saved list.'
      );
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setSavingId('');
    }
  };

  const submitProposal = async (e) => {
    e.preventDefault();
    setSending(true);
    setNotice('');
    try {
      await api.post(`/proposals/project/${selected.id}`, {
        coverLetter: proposal.coverLetter,
        bidAmount: Number(proposal.bidAmount),
        deliveryDays: Number(proposal.deliveryDays),
      });
      setNotice('Your proposal has been submitted successfully to the client.');
      setSelected(null);
      setProposal({ coverLetter: '', bidAmount: '', deliveryDays: '14' });
      loadProjects();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={publicMode ? 'public-listing-page' : ''}>
      {publicMode ? (
        <div className="public-listing-head">
          <div className="eyebrow">EXPLORE OPPORTUNITIES</div>
          <h1>Discover projects that fit your skills</h1>
          <p>Browse open freelance projects from verified clients across high-growth domains.</p>
        </div>
      ) : (
        <PageHeader
          eyebrow="FREELANCE OPPORTUNITIES"
          title="Find Your Next Project"
          description="Browse client listings, filter by required technology stack, and submit high-impact proposals."
        />
      )}

      {/* Filter and Search Toolbar */}
      <div className="panel" style={{ padding: 18, marginBottom: 24 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Search projects by keyword, deliverable, or client..."
              />
            </div>

            <div className="select-wrap">
              <SlidersHorizontal size={15} color="var(--text-muted)" />
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-wrap">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Most Recent</option>
                <option value="budget-high">Highest Budget</option>
                <option value="budget-low">Lowest Budget</option>
              </select>
            </div>

            <Button type="submit" size="md">
              Apply Filters
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Refine parameters:
            </span>

            <input
              type="text"
              placeholder="Skill filter (e.g. React)"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                width: 170,
              }}
            />

            <input
              type="number"
              placeholder="Min ₹"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                width: 120,
              }}
            />

            <input
              type="number"
              placeholder="Max ₹"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                width: 120,
              }}
            />

            {(query || category !== 'All categories' || skill || minBudget || maxBudget) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All categories');
                  setSkill('');
                  setMinBudget('');
                  setMaxBudget('');
                  setSort('newest');
                }}
                style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        </form>
      </div>

      {notice && <div className="inline-notice">{notice}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* Projects Grid */}
      {loading ? (
        <LoadingState message="Searching available opportunities..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={Briefcase}
            title="No matching projects found"
            description="Try broadening your search keywords or adjusting your budget filter criteria."
          />
        </div>
      ) : (
        <div className="project-grid">
          {items.map((project) => {
            const isSaved = savedIds.includes(project.id);
            const isFreelancer = user?.role === 'FREELANCER';

            return (
              <article className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span className="category-tag">{project.category}</span>
                  {project.teamEnabled ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      <Users size={13} /> Team Project
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>
                      ● Open
                    </span>
                  )}
                </div>

                <h3>{project.title}</h3>
                <p className="project-desc">{project.description}</p>

                <div className="skill-tags">
                  {(project.skills || []).slice(0, 4).map((sk) => (
                    <span key={sk}>{sk}</span>
                  ))}
                  {(project.skills || []).length > 4 && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      +{project.skills.length - 4} more
                    </span>
                  )}
                </div>

                <div className="project-meta">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(project.budgetMin).toLocaleString('en-IN')} – ₹{Number(project.budgetMax).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {project._count?.proposals || 0} proposals
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className="avatar avatar-small">
                      {project.client?.name?.slice(0, 1)?.toUpperCase() || 'C'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.client?.name || 'Verified Client'}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        {project.client?.location || 'India'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="project-card-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDetailsProject(project)}
                  >
                    Details
                  </Button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {isFreelancer && (
                      <button
                        className="icon-button"
                        style={{ height: 34, width: 34 }}
                        onClick={() => toggleSave(project.id)}
                        disabled={savingId === project.id}
                        aria-label={isSaved ? 'Remove bookmark' : 'Bookmark project'}
                        title={isSaved ? 'Saved' : 'Save project'}
                      >
                        <Bookmark
                          size={15}
                          fill={isSaved ? 'var(--primary)' : 'none'}
                          color={isSaved ? 'var(--primary)' : 'currentColor'}
                        />
                      </button>
                    )}

                    {isFreelancer ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(project);
                          setProposal({
                            coverLetter: '',
                            bidAmount: String(project.budgetMin),
                            deliveryDays: '14',
                          });
                        }}
                      >
                        Apply <Send size={13} />
                      </Button>
                    ) : !user ? (
                      <Link to="/login" className="btn btn-primary btn-sm">
                        Sign in to apply
                      </Link>
                    ) : null}
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
        title={detailsProject?.title || 'Project Details'}
        subtitle={`Posted by ${detailsProject?.client?.name || 'Client'} in ${detailsProject?.category || 'General'}`}
        wide
      >
        {detailsProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '14px 18px', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <small style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>BUDGET RANGE</small>
                <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                  ₹{Number(detailsProject.budgetMin).toLocaleString('en-IN')} – ₹{Number(detailsProject.budgetMax).toLocaleString('en-IN')}
                </strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                <small style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>PROPOSALS</small>
                <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                  {detailsProject._count?.proposals || 0} applications
                </strong>
              </div>
              {detailsProject.deadline && (
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                  <small style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>DEADLINE</small>
                  <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                    {new Date(detailsProject.deadline).toLocaleDateString()}
                  </strong>
                </div>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Project Description</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {detailsProject.description}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Skills & Requirements</h4>
              <div className="skill-tags">
                {(detailsProject.skills || []).map((sk) => (
                  <span key={sk}>{sk}</span>
                ))}
              </div>
            </div>

            {user?.role === 'FREELANCER' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <Button
                  variant="secondary"
                  onClick={() => setDetailsProject(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const target = detailsProject;
                    setDetailsProject(null);
                    setSelected(target);
                    setProposal({
                      coverLetter: '',
                      bidAmount: String(target.budgetMin),
                      deliveryDays: '14',
                    });
                  }}
                >
                  Submit Proposal <Send size={14} />
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Proposal Submission Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Apply for: ${selected?.title}`}
        subtitle="Pitch your expertise, outline your deliverable timeline, and specify your bid."
      >
        <form onSubmit={submitProposal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="two-fields">
            <div className="form-field">
              <span>Your bid amount (₹) *</span>
              <input
                type="number"
                min="1"
                max="99999999"
                value={proposal.bidAmount}
                onChange={(e) => setProposal({ ...proposal, bidAmount: e.target.value })}
                required
                placeholder="e.g. 15000"
              />
            </div>

            <div className="form-field">
              <span>Delivery timeline (Days) *</span>
              <input
                type="number"
                min="1"
                max="365"
                value={proposal.deliveryDays}
                onChange={(e) => setProposal({ ...proposal, deliveryDays: e.target.value })}
                required
                placeholder="e.g. 14"
              />
            </div>
          </div>

          <div className="form-field">
            <span>Cover letter / Project Pitch *</span>
            <textarea
              rows={6}
              value={proposal.coverLetter}
              onChange={(e) => setProposal({ ...proposal, coverLetter: e.target.value })}
              required
              minLength={30}
              maxLength={4000}
              placeholder="Explain why you are the best fit for this project. Reference relevant past work, explain your technical solution, and propose your initial milestones..."
            />
            <small>Detail your relevant experience and specific delivery plan.</small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={sending} size="lg">
              Send Proposal <Send size={15} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
