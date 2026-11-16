import { useEffect, useState } from 'react';
import {
  MessageSquareQuote,
  Star,
  Send,
  Award,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  Modal,
} from '../components/Primitives';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ given: [], received: [] });
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review modal state
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const loadReviews = async () => {
    try {
      const [reviewResult, contractResult] = await Promise.all([
        api.get('/reviews/mine'),
        api.get('/contracts/mine'),
      ]);
      setData(reviewResult.data || { given: [], received: [] });

      const reviewed = new Set(
        (reviewResult.data.given || []).map((review) => review.contractId)
      );
      setEligible(
        (contractResult.data.items || []).filter(
          (contract) => contract.status === 'COMPLETED' && !reviewed.has(contract.id)
        )
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const submitReview = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/reviews', {
        contractId: selected.id,
        rating: Number(rating),
        comment: comment.trim(),
      });
      setSelected(null);
      setComment('');
      setRating(5);
      setNotice('Your review has been published successfully.');
      await loadReviews();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="REPUTATION & FEEDBACK"
        title="Reviews & Trust"
        description="Review ratings you have received from completed contracts and recognize excellent collaborations."
      />

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="inline-notice">{notice}</div>}

      {loading ? (
        <LoadingState message="Loading review records..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Pending Reviews Prompt */}
          {eligible.length > 0 && (
            <section
              className="panel"
              style={{
                padding: 24,
                background: 'linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%)',
                borderColor: '#E9D5FF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, color: '#581C87' }}>Leave Collaboration Feedback</h3>
                  <p style={{ color: '#6B21A8', fontSize: 13 }}>
                    You have completed contracts eligible for reciprocal review.
                  </p>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: '#9333EA',
                    color: '#FFF',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {eligible.length} pending
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {eligible.map((contract) => {
                  const partnerName =
                    contract.clientId === user?.id
                      ? contract.freelancer?.name
                      : contract.client?.name;

                  return (
                    <div
                      key={contract.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#FFFFFF',
                        border: '1px solid #E9D5FF',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14 }}>{contract.project.title}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Collaboration with {partnerName || 'Partner'}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(contract);
                          setRating(5);
                          setComment('');
                        }}
                      >
                        <Star size={14} /> Write Review
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Two Columns: Received vs Given */}
          <div className="reviews-layout">
            {/* Reviews Received */}
            <section className="panel" style={{ padding: 24 }}>
              <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
                <div>
                  <h2>Reviews Received</h2>
                  <p>Feedback left by clients or freelancers who worked with you.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                  {data.received.length} Total
                </span>
              </div>

              {data.received.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No reviews received yet"
                  description="Completed contracts will yield client ratings and written feedback that calculate your TrustScore."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.received.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      person={review.reviewer?.name || 'Client'}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Reviews Given */}
            <section className="panel" style={{ padding: 24 }}>
              <div className="panel-heading" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
                <div>
                  <h2>Reviews Given</h2>
                  <p>Feedback you provided for completed project collaborations.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                  {data.given.length} Total
                </span>
              </div>

              {data.given.length === 0 ? (
                <EmptyState
                  icon={MessageSquareQuote}
                  title="No reviews submitted yet"
                  description="After approving or delivering a completed contract, you can publish reviews here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.given.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      person={review.reviewee?.name || 'Freelancer'}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.project.title || 'Submit Feedback'}
        subtitle="Share your evaluation of this collaboration to maintain community trust."
      >
        <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-field">
            <span>Overall Rating</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setRating(val)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: val <= rating ? '#FEF3C7' : 'var(--bg-page)',
                    color: val <= rating ? '#D97706' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  aria-label={`${val} Star`}
                >
                  <Star size={24} fill="currentColor" />
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <span>Written Feedback *</span>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={1500}
              placeholder="Highlight strengths, quality of delivery, communication clarity, and whether you would work together again..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={sending}>
              Publish Review <Send size={15} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ReviewCard({ review, person }) {
  return (
    <article
      style={{
        padding: 16,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="avatar avatar-small">{person.slice(0, 1)}</span>
          <div>
            <strong style={{ fontSize: 13.5, color: 'var(--text-main)' }}>{person}</strong>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {review.contract?.project?.title || 'Contract engagement'}
            </div>
          </div>
        </div>

        <span style={{ color: '#F59E0B', fontSize: 14 }}>
          {'★'.repeat(review.rating)}
          <span style={{ color: '#CBD5E1' }}>{'★'.repeat(5 - review.rating)}</span>
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
        {review.comment}
      </p>

      <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {new Date(review.createdAt).toLocaleDateString()}
      </small>
    </article>
  );
}
