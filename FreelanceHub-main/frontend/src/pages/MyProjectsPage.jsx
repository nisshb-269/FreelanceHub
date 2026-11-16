import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  Eye,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusPill,
  Modal,
} from '../components/Primitives';

export default function MyProjectsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('ALL');

  const loadProjects = async () => {
    try {
      const { data } = await api.get('/projects/mine');
      setItems(data.items || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const viewProposals = async (project) => {
    setSelected(project);
    setProposalsLoading(true);
    try {
      const { data } = await api.get(`/proposals/project/${project.id}`);
      setProposals(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProposalsLoading(false);
    }
  };

  const processProposal = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/proposals/${id}/status`, { status });
      if (selected) {
        await viewProposals(selected);
      }
      await loadProjects();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const cancelProject = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this open project?')) return;
    try {
      await api.patch(`/projects/${id}`, { status: 'CANCELLED' });
      await loadProjects();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const filteredItems = items.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  return (
    <div>
      <PageHeader
        eyebrow="CLIENT WORKSPACE"
        title="My Projects"
        description="Oversee your posted project listings, track incoming applications, and hire specialists."
        action={
          <Link to="/app/post-project" className="btn btn-primary">
            <Plus size={16} /> Post a project
          </Link>
        }
      />

      {error && <div className="form-error">{error}</div>}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'ALL'
              ? `All (${items.length})`
              : `${tab.replaceAll('_', ' ')} (${items.filter((i) => i.status === tab).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading your projects..." />
      ) : filteredItems.length === 0 ? (
        <div className="panel" style={{ padding: 24 }}>
          <EmptyState
            icon={Briefcase}
            title={items.length === 0 ? 'No projects posted yet' : 'No projects match this status'}
            description={
              items.length === 0
                ? 'Create your first project listing to specify your deliverables, set a budget, and attract qualified talent.'
                : 'Switch filters or create a new project listing.'
            }
            action={
              <Link to="/app/post-project" className="btn btn-primary">
                Post your first project <ArrowRight size={15} />
              </Link>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredItems.map((item) => (
            <article key={item.id} className="panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className="category-tag">{item.category}</span>
                    <StatusPill value={item.status} />
                    {item.teamEnabled && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'var(--primary-light)',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        <Users size={12} /> Team Project ({item._count?.teamMembers || 0}/{item.teamSize} seats)
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: 18, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                    {item.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 20,
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <span>
                      <strong>Budget:</strong> ₹{Number(item.budgetMin).toLocaleString('en-IN')} – ₹{Number(item.budgetMax).toLocaleString('en-IN')}
                    </span>
                    <span>
                      <strong>Proposals:</strong> {item._count?.proposals || 0} received
                    </span>
                    {item.deadline && (
                      <span>
                        <strong>Target Deadline:</strong> {new Date(item.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      <strong>Posted:</strong> {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Button variant="secondary" size="md" onClick={() => viewProposals(item)}>
                    <Eye size={16} /> View proposals ({item._count?.proposals || 0})
                  </Button>

                  {item.teamEnabled && (
                    <Link to={`/app/teams/${item.id}`} className="btn btn-secondary btn-md">
                      <Users size={16} /> Team workspace
                    </Link>
                  )}

                  {item.status === 'OPEN' && (
                    <button
                      className="icon-button danger-icon"
                      onClick={() => cancelProject(item.id)}
                      title="Cancel project"
                      aria-label="Cancel project"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Proposal Review Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Review Proposals'}
        subtitle="Compare candidates, examine proposals and hire the specialist for this project."
        wide
      >
        {proposalsLoading ? (
          <LoadingState message="Fetching proposals for this project..." />
        ) : proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals received yet"
            description="Freelancers searching for this category will appear here once they submit their applications."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {proposals.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 20,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="avatar">
                      {p.freelancer?.name?.slice(0, 1)?.toUpperCase() || 'F'}
                    </span>
                    <div>
                      <strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                        {p.freelancer?.name}
                      </strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.freelancer?.freelancerProfile?.headline || 'Independent Freelancer'}
                      </div>
                    </div>
                  </div>
                  <StatusPill value={p.status} />
                </div>

                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {p.coverLetter}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', gap: 20, color: 'var(--text-secondary)' }}>
                    <span>
                      Proposed Bid: <strong style={{ color: 'var(--text-main)' }}>₹{Number(p.bidAmount).toLocaleString('en-IN')}</strong>
                    </span>
                    <span>
                      Delivery: <strong>{p.deliveryDays} days</strong>
                    </span>
                    <span>Applied: {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>

                  {p.status === 'PENDING' && selected?.status === 'OPEN' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === p.id}
                        onClick={() => processProposal(p.id, 'REJECTED')}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        loading={busyId === p.id}
                        onClick={() => processProposal(p.id, 'ACCEPTED')}
                      >
                        Hire Freelancer <ArrowUpRight size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
