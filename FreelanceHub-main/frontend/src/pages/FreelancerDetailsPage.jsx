import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  ExternalLink,
  MapPin,
  MessageCircle,
  Star,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, EmptyState, LoadingState } from '../components/Primitives';
import TrustScoreCard from '../components/TrustScoreCard';

function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function FreelancerDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/users/freelancers/${id}`)
      .then(({ data }) => setPerson(data.freelancer))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
        <LoadingState message="Loading freelancer profile..." />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
        <Link className="text-link" to="/freelancers" style={{ marginBottom: 20 }}>
          <ArrowLeft size={16} /> Back to talent directory
        </Link>
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            title="Profile Unavailable"
            description={error || 'This freelancer profile could not be found or is inactive.'}
          />
        </div>
      </div>
    );
  }

  const startMessage = () => {
    if (user) {
      navigate(`/app/messages/${person.id}`);
    } else {
      navigate('/login');
    }
  };

  const portfolioUrl = safeHttpUrl(person.freelancerProfile?.portfolioUrl);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link
        className="text-link"
        to="/freelancers"
        style={{ marginBottom: 24, display: 'inline-flex' }}
      >
        <ArrowLeft size={16} /> Back to talent directory
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'flex-start' }}>
        {/* Main Profile Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header Banner Card */}
          <div className="panel" style={{ padding: 32 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <span
                className="avatar"
                style={{ width: 72, height: 72, fontSize: 26, borderRadius: 'var(--radius-lg)' }}
              >
                {person.name?.slice(0, 1)?.toUpperCase() || 'F'}
              </span>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 24 }}>{person.name}</h1>
                  {person.isVerified && <BadgeCheck size={20} color="var(--success)" />}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: '4px 0 12px' }}>
                  {person.freelancerProfile?.headline || 'Independent Specialist'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {person.location && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={14} color="var(--text-muted)" /> {person.location}
                    </span>
                  )}

                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={14} fill="#F59E0B" color="#F59E0B" />
                    <strong>{Number(person.averageRating || 0).toFixed(1)}</strong> ({person.reviewCount} reviews)
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    {person.freelancerProfile?.completedJobs || 0} completed contracts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Algorithmic TrustScore Breakdown */}
          <TrustScoreCard trustScore={person.trustScore} />

          {/* About Section */}
          <div className="panel" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>About & Background</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {person.bio || 'This freelancer has not added a detailed biography yet.'}
            </p>
          </div>

          {/* Skills & Expertise */}
          <div className="panel" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Skills & Tech Stack</h2>
            <div className="skill-tags">
              {(person.freelancerProfile?.skills || []).map((skill) => (
                <span
                  key={skill}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderColor: 'rgba(108, 92, 231, 0.2)',
                    fontWeight: 600,
                  }}
                >
                  {skill}
                </span>
              ))}
              {(person.freelancerProfile?.skills || []).length === 0 && (
                <span style={{ color: 'var(--text-muted)' }}>No skills listed yet.</span>
              )}
            </div>
          </div>

          {/* Experience Section */}
          {person.freelancerProfile?.experience && (
            <div className="panel" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Experience & Projects</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {person.freelancerProfile.experience}
              </p>
            </div>
          )}

          {/* Client Feedback / Reviews */}
          <div className="panel" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>
              Client Reviews & Feedback ({person.reviewsReceived?.length || 0})
            </h2>

            {(!person.reviewsReceived || person.reviewsReceived.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
                No completed contract reviews recorded yet. Reviews are verified automatically upon contract completion.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {person.reviewsReceived.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                        {review.reviewer?.name || 'Verified Client'}
                      </strong>
                      <span style={{ color: '#F59E0B', fontSize: 14 }}>
                        {'★'.repeat(review.rating)}
                        <span style={{ color: '#CBD5E1' }}>{'★'.repeat(5 - review.rating)}</span>
                      </span>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 8 }}>
                      {review.comment}
                    </p>

                    <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aside Card */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              HIRE {person.name.split(' ')[0].toUpperCase()}
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 16px' }}>
              {person.freelancerProfile?.hourlyRate
                ? `₹${Number(person.freelancerProfile.hourlyRate).toLocaleString('en-IN')}`
                : 'Open'}
              <small style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                {person.freelancerProfile?.hourlyRate ? ' / hour' : ' to offers'}
              </small>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              {person.freelancerProfile?.availability || 'Available for projects'}
            </div>

            <Button
              size="lg"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={startMessage}
            >
              <MessageCircle size={16} /> Contact Specialist
            </Button>

            {portfolioUrl && (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-md"
                style={{ width: '100%' }}
              >
                Inspect Portfolio <ExternalLink size={14} />
              </a>
            )}
          </div>

          <div className="panel" style={{ padding: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: 6 }}>
              Platform Verification
            </strong>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
              {person.isVerified
                ? 'Identity and portfolio verified by FreelanceHub community administration.'
                : 'Registered community professional.'}
            </p>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Member since {new Date(person.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
