import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  User,
  X,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchField,
} from '../components/Primitives';

export default function MessagesPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);

  // New message contact picker
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const threadRequestRef = useRef(0);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (id, requestId) => {
    try {
      setError('');
      const { data } = await api.get(`/messages/${id}`);
      if (requestId !== threadRequestRef.current) return;
      setActiveUser(data.user);
      setMessages(data.items || []);
      await loadConversations();
    } catch (err) {
      if (requestId !== threadRequestRef.current) return;
      setActiveUser(null);
      setMessages([]);
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (showNewMessage) {
      threadRequestRef.current += 1;
      setActiveUser(null);
      setMessages([]);
      return undefined;
    }

    if (!userId) {
      threadRequestRef.current += 1;
      setActiveUser(null);
      setMessages([]);
      return undefined;
    }

    const requestId = ++threadRequestRef.current;
    setActiveUser(null);
    setMessages([]);
    loadThread(userId, requestId);

    return () => {
      if (threadRequestRef.current === requestId) threadRequestRef.current += 1;
    };
  }, [userId, showNewMessage]);

  useEffect(() => {
    if (!showNewMessage) return undefined;
    let cancelled = false;
    setContactLoading(true);
    setContactError('');

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/messages/contacts', {
          params: { q: contactQuery.trim() },
        });
        if (!cancelled) setContacts(data.items || []);
      } catch (err) {
        if (!cancelled) setContactError(errorMessage(err));
      } finally {
        if (!cancelled) setContactLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showNewMessage, contactQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('freelancehub_token');
    if (!token) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('message:new', (message) => {
      if ([message.senderId, message.receiverId].includes(user?.id)) {
        if (userId && (message.senderId === userId || message.receiverId === userId)) {
          setMessages((prev) =>
            prev.some((item) => item.id === message.id) ? prev : [...prev, message]
          );
        }
        loadConversations();
      }
    });

    return () => socket.disconnect();
  }, [user?.id, userId]);

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim() || !userId || sending) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/messages/${userId}`, { content: content.trim() });
      setMessages((prev) =>
        prev.some((item) => item.id === data.message.id) ? prev : [...prev, data.message]
      );
      setContent('');
      await loadConversations();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const startNewMessage = () => {
    threadRequestRef.current += 1;
    setShowNewMessage(true);
    setContactQuery('');
    setContacts([]);
    setActiveUser(null);
    setMessages([]);
  };

  const selectContact = (contact) => {
    setShowNewMessage(false);
    navigate(`/app/messages/${contact.id}`);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!query.trim()) return true;
    return c.user?.name?.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        eyebrow="COMMUNICATION HUB"
        title="Messages"
        description="Connect directly with clients and collaborators in real time."
      />

      {error && <div className="form-error">{error}</div>}

      <div className="messages-layout">
        {/* Left: Conversation List Sidebar */}
        <div className="messages-sidebar">
          <div className="messages-sidebar-head">
            <strong style={{ fontSize: 14 }}>Conversations</strong>
            <Button size="sm" onClick={startNewMessage}>
              <Plus size={14} /> New
            </Button>
          </div>

          <div style={{ padding: '10px 14px' }}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search conversations..."
            />
          </div>

          <div className="conversation-list">
            {loading ? (
              <LoadingState message="Loading..." />
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No active conversations yet. Click "New" to start messaging.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const active = userId === c.user?.id;
                return (
                  <div
                    key={c.user?.id}
                    className={`conversation-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      setShowNewMessage(false);
                      navigate(`/app/messages/${c.user?.id}`);
                    }}
                  >
                    <span className="avatar avatar-small">
                      {c.user?.name?.slice(0, 1)?.toUpperCase() || 'U'}
                    </span>
                    <div className="conversation-copy">
                      <strong>{c.user?.name}</strong>
                      <p>{c.lastMessage?.content || 'No messages yet'}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="nav-count" style={{ marginLeft: 6 }}>
                        {c.unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Area or New Message Picker */}
        <div className="chat-main">
          {showNewMessage ? (
            <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16 }}>New Message</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>Select a contact from the community.</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowNewMessage(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <input
                type="text"
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder="Type member name to search..."
                style={{ height: 42, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, marginBottom: 16 }}
              />

              {contactLoading ? (
                <LoadingState message="Searching contacts..." />
              ) : contacts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: 'auto' }}>
                  {contactQuery ? 'No contacts match your query.' : 'Type a name above to search active users.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card-subtle)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <span className="avatar avatar-small">{contact.name?.slice(0, 1)}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{contact.name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {contact.freelancerProfile?.headline || contact.role?.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeUser ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="avatar avatar-small">
                    {activeUser.name?.slice(0, 1)?.toUpperCase() || 'U'}
                  </span>
                  <div>
                    <strong style={{ fontSize: 14.5, color: 'var(--text-main)' }}>{activeUser.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeUser.role?.toLowerCase()}</div>
                  </div>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="chat-messages-area">
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Send a message to begin the conversation with {activeUser.name}.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOutgoing = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}
                      >
                        <div>{m.content}</div>
                        <div className="message-meta">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Chat Composer */}
              <form className="chat-composer" onSubmit={send}>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Write a message to ${activeUser.name}...`}
                />
                <Button type="submit" loading={sending} disabled={!content.trim()}>
                  <Send size={15} />
                </Button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: 40 }}>
              <EmptyState
                icon={MessageCircle}
                title="Select a conversation"
                description="Pick a contact from the sidebar or click 'New' to search for members."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
