import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

const taskStatuses = [
  { value: 'TODO', label: 'To Do', description: 'Ready to be worked on' },
  { value: 'IN_PROGRESS', label: 'In Progress', description: 'Currently active' },
  { value: 'IN_REVIEW', label: 'In Review', description: 'Pending client review' },
  { value: 'DONE', label: 'Done', description: 'Completed and verified' },
];

export default function TeamProjectsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teams');
      setItems(data.items || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/teams/${projectId}`);
      setTeam(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadTeam();
    else loadList();
  }, [projectId]);

  const respondToInvite = async (response) => {
    const invitation = team?.access?.invitation;
    if (!invitation) return;
    try {
      await api.patch(`/teams/${projectId}/invitations/${invitation.id}`, { response });
      setNotice(response === 'ACCEPTED' ? 'You have joined the project team.' : 'Invitation declined.');
      await loadTeam();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const refreshTeam = async (message) => {
    if (message) setNotice(message);
    await loadTeam();
  };

  if (!projectId) {
    return <TeamList items={items} loading={loading} error={error} userRole={user?.role} />;
  }

  if (loading) return <LoadingState message="Loading team workspace..." />;

  if (!team) {
    return (
      <div>
        <PageHeader eyebrow="TEAM COLLABORATION" title="Team Workspace" />
        {error && <div className="form-error">{error}</div>}
        <Link to="/app/teams" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to teams
        </Link>
      </div>
    );
  }

  const { project, members, tasks, messages, access } = team;
  const activeMembers = members.filter((m) => m.status === 'ACCEPTED');
  const reservedSlots = members.filter((m) => ['PENDING', 'ACCEPTED'].includes(m.status)).length;
  const canWork = access.isOwner || access.isMember;

  return (
    <div className="team-workspace">
      <PageHeader
        eyebrow="COLLABORATIVE PROJECT WORKSPACE"
        title={project.title}
        description={project.description}
        action={
          <Link to="/app/teams" className="text-link">
            <ArrowLeft size={16} /> All team projects
          </Link>
        }
      />

      {notice && <div className="inline-notice">{notice}</div>}
      {error && <div className="form-error">{error}</div>}

      {/* Pending Invitation Banner */}
      {access.invitation && (
        <section
          className="panel"
          style={{
            padding: 20,
            background: 'var(--primary-light)',
            borderColor: 'rgba(108, 92, 231, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#FFF',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Users size={20} />
            </span>
            <div>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                You have been invited to collaborate
              </strong>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                Role: <strong>{access.invitation.roleLabel}</strong>. Accept to gain access to the shared Kanban board and team discussion.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button size="sm" onClick={() => respondToInvite('ACCEPTED')}>
              <Check size={14} /> Accept Invitation
            </Button>
            <Button size="sm" variant="secondary" onClick={() => respondToInvite('DECLINED')}>
              <X size={14} /> Decline
            </Button>
          </div>
        </section>
      )}

      {/* Overview Stats */}
      <div className="team-overview-grid">
        <section className="team-overview-card">
          <span className="team-overview-icon">
            <Users size={20} />
          </span>
          <div>
            <small>Team Members</small>
            <strong>
              {activeMembers.length} / {project.teamSize}
            </strong>
            <p>{reservedSlots - activeMembers.length} invitation(s) pending response</p>
          </div>
        </section>

        <section className="team-overview-card">
          <span className="team-overview-icon">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <small>Tasks Completed</small>
            <strong>
              {tasks.filter((t) => t.status === 'DONE').length} / {tasks.length}
            </strong>
            <p>Shared task board progress</p>
          </div>
        </section>

        <section className="team-overview-card">
          <span className="team-overview-icon">
            <Calendar size={20} />
          </span>
          <div>
            <small>Target Deadline</small>
            <strong style={{ fontSize: 17 }}>
              {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}
            </strong>
            <p>{project.deadline ? 'Project schedule' : 'No strict deadline set'}</p>
          </div>
        </section>
      </div>

      {/* Members & Invitation Panel */}
      <div className="team-content-grid">
        <section className="panel" style={{ padding: 24 }}>
          <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
            <div>
              <h2>Team Roster</h2>
              <p>Specialists contributing to this project.</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              {activeMembers.length} Active Member(s)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Client Owner Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="avatar avatar-small">
                {project.client?.name?.slice(0, 1)?.toUpperCase() || 'C'}
              </span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>
                  {project.client?.name || 'Project Client'}
                </strong>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Project Owner · Client</div>
              </div>
              <span className="verified-pill">
                <ShieldCheck size={12} /> Owner
              </span>
            </div>

            {/* Freelancer Members Rows */}
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="avatar avatar-small">
                  {member.freelancer?.name?.slice(0, 1)?.toUpperCase() || 'F'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>
                    {member.freelancer?.name}
                  </strong>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.roleLabel}
                    {member.freelancer?.freelancerProfile?.headline
                      ? ` · ${member.freelancer.freelancerProfile.headline}`
                      : ''}
                  </div>
                </div>
                <StatusPill value={member.status} />

                {(access.isOwner || (access.isMember && member.freelancerId === user?.id)) && (
                  <button
                    type="button"
                    className="icon-button danger-icon"
                    style={{ width: 30, height: 30 }}
                    title={access.isOwner ? 'Remove member' : 'Leave team'}
                    aria-label={access.isOwner ? `Remove ${member.freelancer?.name}` : 'Leave team'}
                    onClick={async () => {
                      const promptMsg = access.isOwner
                        ? `Remove ${member.freelancer?.name} from this team?`
                        : 'Leave this project team? Your assigned tasks will be unassigned.';
                      if (!window.confirm(promptMsg)) return;
                      try {
                        await api.delete(`/teams/${projectId}/members/${member.id}`);
                        if (!access.isOwner) navigate('/app/teams');
                        else await refreshTeam('Team membership updated.');
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invite Freelancer Widget for Client Owner */}
          {access.isOwner && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <UserPlus size={16} color="var(--primary)" />
                <strong style={{ fontSize: 13.5 }}>Invite Specialist to Team</strong>
              </div>
              <InviteFreelancer
                projectId={projectId}
                activeCount={reservedSlots}
                maxCount={project.teamSize}
                onInvited={refreshTeam}
              />
            </div>
          )}
        </section>

        {/* Workspace Rules & Guidelines */}
        <section className="panel" style={{ padding: 24 }}>
          <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
            <div>
              <h2>Team Collaboration Guidelines</h2>
              <p>Structure and communication best practices.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>01</span>
              <div>
                <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>Task Ownership</strong>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Assign each task to an active specialist. Keep tasks in progress up to date.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>02</span>
              <div>
                <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>Real-Time Coordination</strong>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Use the team discussion feed below for daily standups, blocking issues, and feedback.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>03</span>
              <div>
                <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>Independent Contracts</strong>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Individual contracts, payments, and ratings operate through standard milestone agreements.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Real-time Team Chat */}
      {canWork && (
        <TeamChat projectId={projectId} messages={messages || []} userId={user?.id} />
      )}

      {/* Shared Interactive Kanban Task Board */}
      {canWork && (
        <TeamTaskBoard
          projectId={projectId}
          tasks={tasks}
          members={activeMembers}
          isOwner={access.isOwner}
          userId={user?.id}
          onRefresh={refreshTeam}
        />
      )}
    </div>
  );
}

function TeamList({ items, loading, error, userRole }) {
  const pendingCount = items.filter((item) => item.membership?.status === 'PENDING').length;

  return (
    <div>
      <PageHeader
        eyebrow="TEAM WORKSPACES"
        title="Collaborative Projects"
        description={
          userRole === 'CLIENT'
            ? 'Coordinate multi-specialist project teams, track team progress, and assign tasks.'
            : 'Collaborate with other freelancers on multi-specialist client projects.'
        }
        action={
          userRole === 'CLIENT' && (
            <Link to="/app/post-project" className="btn btn-primary">
              <Plus size={16} /> Post Team Project
            </Link>
          )
        }
      />

      {error && <div className="form-error">{error}</div>}

      {pendingCount > 0 && (
        <div className="inline-notice" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} />
          <span>
            You have {pendingCount} pending team invitation(s). Open the project to accept or decline.
          </span>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading your teams..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={Users}
            title="No collaborative projects found"
            description={
              userRole === 'CLIENT'
                ? 'Enable team collaboration when creating a project to assemble multi-specialist squads.'
                : 'When a client invites you to a team workspace, it will appear here.'
            }
            action={
              userRole === 'CLIENT' ? (
                <Link to="/app/post-project" className="btn btn-primary">
                  Create team project <ArrowRight size={14} />
                </Link>
              ) : (
                <Link to="/app/find-projects" className="btn btn-secondary">
                  Explore open projects
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(({ project, membership }) => {
            const pending = membership?.status === 'PENDING';

            return (
              <article key={project.id} className="panel" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span className="category-tag">{project.category}</span>
                      <StatusPill value={project.status} />
                      {pending && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--warning)',
                            background: 'var(--warning-bg)',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          Invitation Pending
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 18, marginBottom: 8 }}>{project.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                      {project.description}
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
                        <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
                        {project._count?.teamMembers || 0} / {project.teamSize} specialists joined
                      </span>
                      <span>
                        <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                        {project._count?.teamTasks || 0} tasks tracked
                      </span>
                      <span>{membership ? `Client: ${project.client?.name || 'Client'}` : 'Your project'}</span>
                    </div>
                  </div>

                  <Link to={`/app/teams/${project.id}`} className="btn btn-primary btn-md">
                    {pending ? 'View invitation' : 'Open team space'} <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteFreelancer({ projectId, activeCount, maxCount, onInvited }) {
  const [query, setQuery] = useState('');
  const [roleLabel, setRoleLabel] = useState('Contributor');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const { data } = await api.get('/users/freelancers', { params: { q: query.trim() } });
      setResults(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const invite = async (person) => {
    setBusyId(person.id);
    setError('');
    try {
      await api.post(`/teams/${projectId}/invitations`, {
        freelancerId: person.id,
        roleLabel: roleLabel.trim() || 'Contributor',
      });
      setResults((curr) => curr.filter((i) => i.id !== person.id));
      await onInvited(`${person.name} has been invited to the team.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
        <span>Team Capacity</span>
        <strong>
          {activeCount} / {maxCount} slots filled
        </strong>
      </div>
      <div style={{ height: 6, background: 'var(--bg-page)', borderRadius: 9999, overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (activeCount / maxCount) * 100)}%`,
            background: 'var(--primary)',
            borderRadius: 9999,
          }}
        />
      </div>

      <form onSubmit={search} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by specialist name or skill..."
          style={{ height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            placeholder="Role title (e.g. Lead UI Designer)"
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, flex: 1 }}
          />
          <Button type="submit" size="sm" loading={searching} disabled={!query.trim()}>
            Find
          </Button>
        </div>
      </form>

      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {results.slice(0, 5).map((person) => (
            <div
              key={person.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="avatar avatar-small">{person.name?.slice(0, 1)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {person.freelancerProfile?.headline || 'Specialist'}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                loading={busyId === person.id}
                disabled={activeCount >= maxCount}
                onClick={() => invite(person)}
              >
                <UserPlus size={13} /> Invite
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamChat({ projectId, messages, userId }) {
  const [content, setContent] = useState('');
  const [items, setItems] = useState(messages);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setItems(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  useEffect(() => {
    const token = localStorage.getItem('freelancehub_token');
    if (!token) return undefined;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('team:message:new', (event) => {
      if (event.projectId === projectId) {
        setItems((current) =>
          current.some((m) => m.id === event.message.id) ? current : [...current, event.message]
        );
      }
    });

    return () => socket.disconnect();
  }, [projectId]);

  const send = async (e) => {
    e.preventDefault();
    const msg = content.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/teams/${projectId}/messages`, { content: msg });
      setItems((current) =>
        current.some((i) => i.id === data.message.id) ? current : [...current, data.message]
      );
      setContent('');
    } catch {
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="panel" style={{ padding: 24 }}>
      <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
        <div>
          <h2>Team Discussion Feed</h2>
          <p>Real-time coordination between all active project members.</p>
        </div>
      </div>

      <div
        style={{
          height: 260,
          overflowY: 'auto',
          padding: 16,
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {items.length === 0 ? (
          <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
            No team messages yet. Say hello to your collaborators!
          </div>
        ) : (
          items.map((m) => {
            const isMe = m.senderId === userId;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {isMe ? 'You' : m.sender?.name}
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isMe ? 'var(--primary)' : '#FFFFFF',
                    color: isMe ? '#FFFFFF' : 'var(--text-main)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an update or question with the project team..."
          style={{ flex: 1, height: 42, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13.5 }}
        />
        <Button type="submit" loading={sending} disabled={!content.trim()}>
          <Send size={15} /> Send
        </Button>
      </form>
    </div>
  );
}

function TeamTaskBoard({ projectId, tasks, members, isOwner, userId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.post(`/teams/${projectId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssigneeId('');
      setShowAdd(false);
      await onRefresh('Task created successfully.');
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const moveTask = async (taskId, nextStatus) => {
    try {
      await api.patch(`/teams/${projectId}/tasks/${taskId}`, { status: nextStatus });
      await onRefresh();
    } catch {}
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/teams/${projectId}/tasks/${taskId}`);
      await onRefresh('Task deleted.');
    } catch {}
  };

  return (
    <div className="panel" style={{ padding: 24 }}>
      <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
        <div>
          <h2>Interactive Kanban Board</h2>
          <p>Collaboratively manage tasks from inception to completion.</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Task
        </Button>
      </div>

      <div className="kanban-board">
        {taskStatuses.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.value);

          return (
            <div key={col.value} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span>{col.label}</span>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, background: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {colTasks.map((task) => (
                <div key={task.id} className="kanban-task-card">
                  <div className="kanban-task-title">{task.title}</div>
                  {task.description && <div className="kanban-task-desc">{task.description}</div>}

                  <div className="kanban-task-footer">
                    <div>
                      {task.assignee ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-main)', fontWeight: 600 }}>
                          <span className="avatar avatar-small" style={{ width: 20, height: 20, fontSize: 9 }}>
                            {task.assignee.name?.slice(0, 1)}
                          </span>
                          {task.assignee.name.split(' ')[0]}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Move left */}
                      {col.value !== 'TODO' && (
                        <button
                          type="button"
                          onClick={() => {
                            const prev = col.value === 'DONE' ? 'IN_REVIEW' : col.value === 'IN_REVIEW' ? 'IN_PROGRESS' : 'TODO';
                            moveTask(task.id, prev);
                          }}
                          style={{ fontSize: 11, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                          title="Move back"
                        >
                          ←
                        </button>
                      )}

                      {/* Move right */}
                      {col.value !== 'DONE' && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = col.value === 'TODO' ? 'IN_PROGRESS' : col.value === 'IN_PROGRESS' ? 'IN_REVIEW' : 'DONE';
                            moveTask(task.id, next);
                          }}
                          style={{ fontSize: 11, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                          title="Move forward"
                        >
                          →
                        </button>
                      )}

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          style={{ fontSize: 11, padding: '2px 5px', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--danger)', cursor: 'pointer' }}
                          title="Delete task"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create New Team Task">
        <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-field">
            <span>Task title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. Implement user authentication endpoint"
            />
          </div>

          <div className="form-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Acceptance criteria and technical notes..."
            />
          </div>

          <div className="two-fields">
            <div className="form-field">
              <span>Assignee</span>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.freelancer?.id} value={m.freelancer?.id}>
                    {m.freelancer?.name} ({m.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
