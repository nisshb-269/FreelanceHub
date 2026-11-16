import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  IndianRupee,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusPill,
  Modal,
} from '../components/Primitives';

const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

export default function ContractsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Deliverables
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadNotice, setUploadNotice] = useState('');

  // Disputes & Milestones modals
  const [showDispute, setShowDispute] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [dispute, setDispute] = useState({ subject: '', description: '' });
  const [milestone, setMilestone] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
  });
  const [disputeNotice, setDisputeNotice] = useState('');
  const [milestoneNotice, setMilestoneNotice] = useState('');

  const loadContracts = async (targetId = id) => {
    setLoading(true);
    try {
      const { data } = await api.get('/contracts/mine');
      const contractList = data.items || [];
      setItems(contractList);

      setSelected((current) => {
        const wanted = targetId || current?.id;
        return (
          contractList.find((item) => item.id === wanted) ||
          contractList[0] ||
          null
        );
      });
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts(id);
  }, [id]);

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const { data } = await api.get(`/contracts/${selected.id}`);
      setSelected(data.contract);
      setItems((current) =>
        current.map((item) => (item.id === data.contract.id ? data.contract : item))
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const updateContractStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/contracts/${selected.id}/status`, { status });
      await loadContracts(selected.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadDeliverable = async () => {
    if (!selected || !selectedFile) return;
    setBusy(true);
    setError('');
    setUploadNotice('');
    try {
      await api.put(`/contracts/${selected.id}/deliverables`, selectedFile, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(selectedFile.name),
          'X-File-Type': selectedFile.type || 'application/octet-stream',
        },
      });
      setSelectedFile(null);
      setUploadNotice('Deliverable file uploaded successfully. You can now submit your work.');
      await refreshSelected();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const downloadDeliverable = async (file) => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.get(
        `/contracts/${selected.id}/deliverables/${file.id}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateMilestone = async (milestoneId, status) => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/contracts/milestones/${milestoneId}/status`, { status });
      await refreshSelected();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const createMilestone = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    setMilestoneNotice('');
    try {
      await api.post(`/contracts/${selected.id}/milestones`, {
        ...milestone,
        amount: Number(milestone.amount),
        dueDate: milestone.dueDate || null,
      });
      setMilestone({ title: '', description: '', amount: '', dueDate: '' });
      setShowMilestone(false);
      setMilestoneNotice('Milestone added successfully.');
      await refreshSelected();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitDispute = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    setDisputeNotice('');
    try {
      await api.post(`/contracts/${selected.id}/disputes`, dispute);
      setDispute({ subject: '', description: '' });
      setShowDispute(false);
      setDisputeNotice('Dispute reported. Our administrative review team has been notified.');
      await refreshSelected();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const isClient = user?.id === selected?.clientId;
  const isFreelancer = user?.id === selected?.freelancerId;

  return (
    <div>
      <PageHeader
        eyebrow="CONTRACT AGREEMENTS"
        title="Contract Management"
        description="Monitor milestone delivery progress, review uploaded deliverables, and approve completed work."
      />

      {error && <div className="form-error">{error}</div>}
      {uploadNotice && <div className="inline-notice">{uploadNotice}</div>}
      {milestoneNotice && <div className="inline-notice">{milestoneNotice}</div>}
      {disputeNotice && <div className="inline-notice">{disputeNotice}</div>}

      {loading ? (
        <LoadingState message="Loading contracts..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={FileText}
            title="No contracts found"
            description="When a proposal is accepted, an active contract with milestones and file delivery capabilities will be initialized here."
          />
        </div>
      ) : (
        <div className="contracts-layout">
          {/* Contracts Sidebar List */}
          <div className="contract-list-sidebar">
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Contracts ({items.length})
            </h3>
            {items.map((c) => {
              const active = selected?.id === c.id;
              const otherParty = user?.id === c.clientId ? c.freelancer?.name : c.client?.name;

              return (
                <div
                  key={c.id}
                  className={`contract-nav-item ${active ? 'active' : ''}`}
                  onClick={() => setSelected(c)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      #{c.id.slice(-6).toUpperCase()}
                    </span>
                    <StatusPill value={c.status} />
                  </div>
                  <h4>{c.project.title}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>{otherParty || 'Participant'}</span>
                    <strong>{money(c.amount)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Contract Workspace */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Contract Header Card */}
              <div className="panel" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span className="eyebrow" style={{ margin: 0 }}>
                        CONTRACT #{selected.id.slice(-8).toUpperCase()}
                      </span>
                      <StatusPill value={selected.status} />
                    </div>
                    <h2 style={{ fontSize: 22 }}>{selected.project.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginTop: 4 }}>
                      Agreement between <strong>{selected.client?.name}</strong> (Client) and{' '}
                      <strong>{selected.freelancer?.name}</strong> (Freelancer)
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <small style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                      CONTRACT AMOUNT
                    </small>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
                      {money(selected.amount)}
                    </div>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="contract-timeline" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <div className={`timeline-step ${['ACTIVE', 'SUBMITTED', 'REVISION_REQUESTED', 'COMPLETED'].includes(selected.status) ? 'completed' : ''}`}>
                    <span className="timeline-dot">1</span>
                    <span className="timeline-label">Active Work</span>
                  </div>

                  <div className={`timeline-step ${['SUBMITTED', 'COMPLETED'].includes(selected.status) ? 'completed' : selected.status === 'REVISION_REQUESTED' ? 'active' : ''}`}>
                    <span className="timeline-dot">2</span>
                    <span className="timeline-label">Submission & Review</span>
                  </div>

                  <div className={`timeline-step ${selected.status === 'COMPLETED' ? 'completed' : ''}`}>
                    <span className="timeline-dot">3</span>
                    <span className="timeline-label">Approved & Completed</span>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* Freelancer actions */}
                    {isFreelancer && ['ACTIVE', 'REVISION_REQUESTED'].includes(selected.status) && (
                      <Button
                        loading={busy}
                        onClick={() => updateContractStatus('SUBMITTED')}
                      >
                        <FileCheck2 size={16} /> Submit Work for Client Review
                      </Button>
                    )}

                    {isFreelancer && selected.status === 'REVISION_REQUESTED' && (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => updateContractStatus('ACTIVE')}
                      >
                        <RefreshCcw size={16} /> Mark as In Revision
                      </Button>
                    )}

                    {/* Client actions */}
                    {isClient && selected.status === 'SUBMITTED' && (
                      <>
                        <Button
                          loading={busy}
                          onClick={() => updateContractStatus('COMPLETED')}
                        >
                          <CheckCircle2 size={16} /> Approve & Complete Contract
                        </Button>
                        <Button
                          variant="secondary"
                          loading={busy}
                          onClick={() => updateContractStatus('REVISION_REQUESTED')}
                        >
                          <RefreshCcw size={16} /> Request Revisions
                        </Button>
                      </>
                    )}
                  </div>

                  {user?.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setShowDispute(true)}
                      style={{ fontSize: 12.5, color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <ShieldAlert size={15} /> Report Issue / Dispute
                    </button>
                  )}
                </div>
              </div>

              {/* Milestones Card */}
              <div className="panel" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>Milestones</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                      Track project phases and approve milestone deliverables.
                    </p>
                  </div>

                  {isClient && selected.status === 'ACTIVE' && (
                    <Button size="sm" variant="secondary" onClick={() => setShowMilestone(true)}>
                      <Plus size={15} /> Add Milestone
                    </Button>
                  )}
                </div>

                {(!selected.milestones || selected.milestones.length === 0) ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    No milestones configured yet for this contract. Total contract payment settles on completion.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selected.milestones.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 14 }}>{m.title}</strong>
                            <StatusPill value={m.status} />
                          </div>
                          {m.description && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginTop: 4 }}>
                              {m.description}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{money(m.amount)}</span>

                          {/* Milestone status updates */}
                          {isFreelancer && m.status === 'PENDING' && (
                            <Button size="sm" variant="secondary" onClick={() => updateMilestone(m.id, 'IN_PROGRESS')}>
                              Start
                            </Button>
                          )}

                          {isFreelancer && ['PENDING', 'IN_PROGRESS'].includes(m.status) && (
                            <Button size="sm" onClick={() => updateMilestone(m.id, 'SUBMITTED')}>
                              Submit
                            </Button>
                          )}

                          {isClient && m.status === 'SUBMITTED' && (
                            <Button size="sm" onClick={() => updateMilestone(m.id, 'APPROVED')}>
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deliverables Card */}
              <div className="panel" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 4 }}>Deliverable Files</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginBottom: 16 }}>
                  Upload work artifacts, ZIPs, designs, or document deliverables for review.
                </p>

                {/* Upload zone for assigned freelancer */}
                {isFreelancer && ['ACTIVE', 'REVISION_REQUESTED'].includes(selected.status) && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="deliverable-dropzone">
                      <Upload size={24} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)' }}>
                        Select deliverable file to upload
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 14px' }}>
                        Supported formats: PDF, ZIP, DOCX, XLSX, TXT, CSV, PNG, JPG (up to 20MB)
                      </p>

                      <input
                        type="file"
                        id="deliverableFileInput"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('deliverableFileInput')?.click()}
                      >
                        {selectedFile ? `Selected: ${selectedFile.name}` : 'Browse Files'}
                      </Button>

                      {selectedFile && (
                        <div style={{ marginTop: 12 }}>
                          <Button size="sm" loading={busy} onClick={uploadDeliverable}>
                            Confirm & Upload Deliverable
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Uploaded Deliverables List */}
                {(!selected.deliverables || selected.deliverables.length === 0) ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    No deliverables uploaded yet for this contract.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selected.deliverables.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <FileText size={20} color="var(--primary)" />
                          <div>
                            <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{file.fileName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {(file.fileSize / 1024).toFixed(1)} KB · Uploaded {new Date(file.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy}
                          onClick={() => downloadDeliverable(file)}
                        >
                          <Download size={14} /> Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Milestone Modal */}
      <Modal
        isOpen={showMilestone}
        onClose={() => setShowMilestone(false)}
        title="Add Contract Milestone"
        subtitle="Divide contract deliverables into verifiable progress increments."
      >
        <form onSubmit={createMilestone} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field">
            <span>Milestone title *</span>
            <input
              type="text"
              value={milestone.title}
              onChange={(e) => setMilestone({ ...milestone, title: e.target.value })}
              required
              maxLength={100}
              placeholder="e.g. Design Prototype & Component Library"
            />
          </div>

          <div className="two-fields">
            <div className="form-field">
              <span>Amount (₹) *</span>
              <input
                type="number"
                min="1"
                value={milestone.amount}
                onChange={(e) => setMilestone({ ...milestone, amount: e.target.value })}
                required
                placeholder="e.g. 10000"
              />
            </div>

            <div className="form-field">
              <span>Due date (Optional)</span>
              <input
                type="date"
                value={milestone.dueDate}
                onChange={(e) => setMilestone({ ...milestone, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <span>Description (Optional)</span>
            <textarea
              rows={3}
              value={milestone.description}
              onChange={(e) => setMilestone({ ...milestone, description: e.target.value })}
              placeholder="Specific acceptance criteria for this milestone..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setShowMilestone(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Add Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Dispute Modal */}
      <Modal
        isOpen={showDispute}
        onClose={() => setShowDispute(false)}
        title="Report Contract Issue / Dispute"
        subtitle="Notify platform administrators if you encounter irreconcilable project issues."
      >
        <form onSubmit={submitDispute} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field">
            <span>Issue subject *</span>
            <input
              type="text"
              value={dispute.subject}
              onChange={(e) => setDispute({ ...dispute, subject: e.target.value })}
              required
              maxLength={200}
              placeholder="e.g. Deliverable does not match approved milestone specification"
            />
          </div>

          <div className="form-field">
            <span>Detailed description *</span>
            <textarea
              rows={5}
              value={dispute.description}
              onChange={(e) => setDispute({ ...dispute, description: e.target.value })}
              required
              maxLength={3000}
              placeholder="Explain the background, what was agreed upon, what was delivered or missed, and what resolution you are requesting..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setShowDispute(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              Submit Dispute Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
