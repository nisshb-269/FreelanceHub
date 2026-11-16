import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  FileText,
  IndianRupee,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusPill,
} from '../components/Primitives';

export default function ProposalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [withdrawingId, setWithdrawingId] = useState('');

  const isFreelancer = user?.role === 'FREELANCER';

  const loadProposals = async () => {
    setLoading(true);
    try {
      if (isFreelancer) {
        const { data } = await api.get('/proposals/mine');
        setItems(data.items || []);
      } else {
        const { data: projects } = await api.get('/projects/mine');
        const groups = await Promise.all(
          (projects.items || []).map(async (project) => {
            const { data } = await api.get(`/proposals/project/${project.id}`);
            return (data.items || []).map((proposal) => ({ ...proposal, project }));
          })
        );
        setItems(groups.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) loadProposals();
  }, [user?.role]);

  const withdrawProposal = async (proposalId) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawingId(proposalId);
    try {
      await api.patch(`/proposals/${proposalId}/withdraw`);
      await loadProposals();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setWithdrawingId('');
    }
  };

  const filteredItems = items.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  return (
    <div>
      <PageHeader
        eyebrow="PROPOSAL MANAGEMENT"
        title={isFreelancer ? 'My Proposals' : 'Applications Received'}
        description={
          isFreelancer
            ? 'Track your submitted bids, review status updates, and manage open project applications.'
            : 'Review all proposals received from specialists across your published projects.'
        }
      />

      {error && <div className="form-error">{error}</div>}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((tab) => {
          const count =
            tab === 'ALL'
              ? items.length
              : items.filter((i) => i.status === tab).length;
          return (
            <button
              key={tab}
              type="button"
              className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'ALL' ? `All (${count})` : `${tab} (${count})`}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState message="Loading proposals..." />
      ) : filteredItems.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={FileText}
            title={items.length === 0 ? 'No proposals recorded' : 'No proposals match this filter'}
            description={
              isFreelancer
                ? 'When you apply to client projects in the marketplace, your bids and status will be tracked here.'
                : 'When freelancers submit proposals for your projects, they will appear here.'
            }
            action={
              isFreelancer && (
                <Link to="/app/find-projects" className="btn btn-primary">
                  Explore open projects
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredItems.map((proposal) => (
            <article key={proposal.id} className="panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span className="category-tag">
                      {isFreelancer
                        ? proposal.project?.category || 'PROJECT'
                        : `Applicant: ${proposal.freelancer?.name}`}
                    </span>
                    <StatusPill value={proposal.status} />
                  </div>

                  <h3 style={{ fontSize: 18, marginBottom: 10 }}>
                    {proposal.project?.title || 'Project Application'}
                  </h3>

                  <div
                    style={{
                      background: 'var(--bg-page)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 16,
                      fontSize: 13.5,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: 16,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {proposal.coverLetter}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 24,
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <span>
                      {isFreelancer ? 'Client: ' : 'Freelancer: '}
                      <strong style={{ color: 'var(--text-main)' }}>
                        {isFreelancer
                          ? proposal.project?.client?.name || 'Client'
                          : proposal.freelancer?.name || 'Freelancer'}
                      </strong>
                    </span>

                    <span>
                      Proposed Bid: <strong style={{ color: 'var(--text-main)' }}>₹{Number(proposal.bidAmount).toLocaleString('en-IN')}</strong>
                    </span>

                    <span>
                      Delivery Estimate: <strong>{proposal.deliveryDays} days</strong>
                    </span>

                    <span>
                      Submitted: {new Date(proposal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {isFreelancer && proposal.status === 'PENDING' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={withdrawingId === proposal.id}
                      onClick={() => withdrawProposal(proposal.id)}
                    >
                      Withdraw bid
                    </Button>
                  )}

                  {!isFreelancer && (
                    <Link to="/app/my-projects" className="btn btn-secondary btn-sm">
                      Manage in My Projects <ArrowUpRight size={14} />
                    </Link>
                  )}

                  {proposal.status === 'ACCEPTED' && (
                    <Link to="/app/contracts" className="btn btn-primary btn-sm">
                      Open contract <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
