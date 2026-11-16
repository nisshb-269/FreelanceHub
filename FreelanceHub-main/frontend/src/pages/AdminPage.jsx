import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  FolderKanban,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  Check,
  X,
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchField,
  StatusPill,
  Modal,
} from '../components/Primitives';

export default function AdminPage() {
  const { section = 'users' } = useParams();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  // Resolution modal for disputes
  const [resolveDisputeModal, setResolveDisputeModal] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoint =
        section === 'projects'
          ? '/admin/projects'
          : section === 'disputes'
          ? '/admin/disputes'
          : '/admin/users';

      const { data } = await api.get(endpoint, {
        params: {
          q: query.trim() || undefined,
          role: role || undefined,
        },
      });
      setItems(data.items || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [section]);

  const toggleUserStatus = async (item) => {
    if (!window.confirm(`${item.isActive ? 'Deactivate' : 'Activate'} user account "${item.name}"?`)) return;
    setBusyId(item.id);
    try {
      await api.patch(`/admin/users/${item.id}/status`, { isActive: !item.isActive });
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const toggleUserVerification = async (item) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/users/${item.id}/verify`, { isVerified: !item.isVerified });
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const updateDisputeStatus = async (disputeId, status, resolution) => {
    setBusyId(disputeId);
    try {
      await api.patch(`/admin/disputes/${disputeId}`, {
        status,
        resolution: resolution || undefined,
      });
      setResolveDisputeModal(null);
      setResolutionText('');
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  const pageTitle =
    section === 'projects'
      ? 'Project Monitoring'
      : section === 'disputes'
      ? 'Dispute Management'
      : 'User Management';

  const pageDescription =
    section === 'projects'
      ? 'Inspect marketplace activity, review active jobs, and verify project compliance.'
      : section === 'disputes'
      ? 'Investigate contract disputes, record administrative findings, and close reported issues.'
      : 'Audit registered accounts, assign verified badges to freelancers, and moderate account statuses.';

  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION CONTROL CENTER"
        title={pageTitle}
        description={pageDescription}
      />

      {error && <div className="form-error">{error}</div>}

      {/* Navigation Tab Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Link
          to="/app/admin/users"
          className={`btn btn-sm ${section === 'users' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Users size={15} /> Users
        </Link>
        <Link
          to="/app/admin/projects"
          className={`btn btn-sm ${section === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FolderKanban size={15} /> Projects
        </Link>
        <Link
          to="/app/admin/disputes"
          className={`btn btn-sm ${section === 'disputes' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <ShieldAlert size={15} /> Disputes
        </Link>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="panel" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {section !== 'disputes' && (
            <div style={{ flex: 1, minWidth: 240 }}>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder={
                  section === 'users' ? 'Search users by name or email...' : 'Search projects...'
                }
              />
            </div>
          )}

          {section === 'users' && (
            <div className="select-wrap">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All Account Roles</option>
                <option value="CLIENT">Clients</option>
                <option value="FREELANCER">Freelancers</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>
          )}

          <Button variant="secondary" onClick={loadData}>
            <Search size={15} /> Filter
          </Button>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <LoadingState message="Fetching administration records..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={section === 'users' ? Users : section === 'disputes' ? ShieldAlert : FolderKanban}
            title="No records found"
            description="No records match your selected query and filter criteria."
          />
        </div>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                {section === 'users' ? (
                  <tr>
                    <th>USER</th>
                    <th>ROLE</th>
                    <th>JOINED</th>
                    <th>ACCOUNT STATUS</th>
                    <th>VERIFICATION</th>
                    <th>ADMIN ACTIONS</th>
                  </tr>
                ) : section === 'projects' ? (
                  <tr>
                    <th>PROJECT</th>
                    <th>CLIENT OWNER</th>
                    <th>PROPOSALS</th>
                    <th>BUDGET RANGE</th>
                    <th>STATUS</th>
                    <th>DATE POSTED</th>
                  </tr>
                ) : (
                  <tr>
                    <th>DISPUTE SUBJECT</th>
                    <th>CONTRACT & PROJECT</th>
                    <th>OPENED BY</th>
                    <th>STATUS</th>
                    <th>FILED DATE</th>
                    <th>ADMIN ACTIONS</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {items.map((item) => {
                  if (section === 'users') {
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar avatar-small">
                              {item.name?.slice(0, 1)?.toUpperCase() || 'U'}
                            </span>
                            <div>
                              <strong>{item.name}</strong>
                              <small>{item.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="role-label">{item.role}</span>
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td>
                          <StatusPill value={item.isActive ? 'ACTIVE' : 'CANCELLED'} />
                        </td>
                        <td>
                          {item.role === 'FREELANCER' ? (
                            item.isVerified ? (
                              <span className="verified-pill">
                                <CheckCircle2 size={13} /> Verified
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Unverified
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="table-action-group">
                            {item.role === 'FREELANCER' && (
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => toggleUserVerification(item)}
                              >
                                {item.isVerified ? 'Remove badge' : 'Grant verified badge'}
                              </button>
                            )}

                            <button
                              type="button"
                              className="danger-text"
                              disabled={busyId === item.id}
                              onClick={() => toggleUserStatus(item)}
                            >
                              {item.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (section === 'projects') {
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <small>{item.category}</small>
                        </td>
                        <td>
                          <strong>{item.client?.name}</strong>
                          <small>{item.client?.email}</small>
                        </td>
                        <td>
                          <strong>{item._count?.proposals || 0}</strong>
                        </td>
                        <td className="money-cell">
                          ₹{Number(item.budgetMin).toLocaleString('en-IN')} – ₹{Number(item.budgetMax).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <StatusPill value={item.status} />
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  }

                  // section === 'disputes'
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.subject}</strong>
                        <small style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description}
                        </small>
                      </td>
                      <td>
                        <strong>{item.contract?.project?.title || 'Contract'}</strong>
                        <small>Contract #{item.contractId?.slice(-6)?.toUpperCase()}</small>
                      </td>
                      <td>
                        <strong>{item.openedBy?.name}</strong>
                      </td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="table-action-group">
                          {item.status === 'OPEN' && (
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => updateDisputeStatus(item.id, 'UNDER_REVIEW')}
                            >
                              Start Review
                            </button>
                          )}

                          {['OPEN', 'UNDER_REVIEW'].includes(item.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveDisputeModal(item);
                                setResolutionText(item.resolution || '');
                              }}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      <Modal
        isOpen={Boolean(resolveDisputeModal)}
        onClose={() => setResolveDisputeModal(null)}
        title="Resolve Contract Dispute"
        subtitle={`Case: ${resolveDisputeModal?.subject}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {resolveDisputeModal?.description}
          </p>

          <div className="form-field">
            <span>Administrative Resolution Finding *</span>
            <textarea
              rows={4}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Record the official resolution terms (e.g. Reviewed deliverables and determined compliance with contract milestone)..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              variant="secondary"
              onClick={() => setResolveDisputeModal(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateDisputeStatus(
                  resolveDisputeModal.id,
                  'RESOLVED',
                  resolutionText.trim() || 'Reviewed and resolved by FreelanceHub Administration.'
                )
              }
            >
              Confirm Resolution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
