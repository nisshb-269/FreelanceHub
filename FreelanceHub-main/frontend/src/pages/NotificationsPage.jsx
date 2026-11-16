import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  FileText,
  MessageCircle,
  Users,
  Star,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { Button, EmptyState, LoadingState, PageHeader } from '../components/Primitives';

const iconFor = (type = '') => {
  if (type === 'NEW_MESSAGE') return MessageCircle;
  if (type.includes('PROPOSAL')) return FileText;
  if (type === 'NEW_REVIEW') return Star;
  if (type === 'SYSTEM') return Users;
  return Bell;
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const readAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      loadNotifications();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const readOne = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <div>
      <PageHeader
        eyebrow="SYSTEM UPDATES"
        title="Notifications"
        description="Stay informed about proposals, active contracts, milestone reviews, team invitations, and incoming messages."
        action={
          unreadCount > 0 && (
            <Button variant="secondary" onClick={readAll}>
              <CheckCheck size={16} /> Mark all as read
            </Button>
          )
        }
      />

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={Bell}
            title="All caught up"
            description="When important project activity or messages arrive in your workspace, notifications will be recorded here."
          />
        </div>
      ) : (
        <div className="notification-list">
          {items.map((item) => {
            const Icon = iconFor(item.type);
            const isUnread = !item.readAt;

            return (
              <div
                key={item.id}
                className={`notification-row ${isUnread ? 'unread' : ''}`}
              >
                <span className="notification-icon">
                  <Icon size={18} strokeWidth={2.2} />
                </span>

                <div className="notification-copy">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{item.title}</strong>
                    {isUnread && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                  <p>{item.message}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>

                <div className="notification-actions">
                  {item.link && (
                    <Link
                      to={item.link}
                      onClick={() => readOne(item.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      View <ArrowRight size={13} />
                    </Link>
                  )}

                  {isUnread && (
                    <button
                      type="button"
                      className="mark-read"
                      onClick={() => readOne(item.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
