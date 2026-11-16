import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Globe,
  MapPin,
  Save,
  User,
  Briefcase,
  Building,
  Sparkles,
} from 'lucide-react';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, PageHeader } from '../components/Primitives';
import TrustScoreCard from '../components/TrustScoreCard';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const isFreelancer = user?.role === 'FREELANCER';
  const isClient = user?.role === 'CLIENT';

  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    headline: user?.freelancerProfile?.headline || '',
    skills: (user?.freelancerProfile?.skills || []).join(', '),
    hourlyRate: user?.freelancerProfile?.hourlyRate || '',
    experience: user?.freelancerProfile?.experience || '',
    portfolioUrl: user?.freelancerProfile?.portfolioUrl || '',
    companyName: user?.clientProfile?.companyName || '',
    industry: user?.clientProfile?.industry || '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [trustScore, setTrustScore] = useState(null);

  useEffect(() => {
    if (isFreelancer && user?.id) {
      api
        .get('/users/me/trust-score')
        .then(({ data }) => setTrustScore(data.trustScore))
        .catch(() => setTrustScore(null));
    }
  }, [isFreelancer, user?.id]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        headline: user.freelancerProfile?.headline || '',
        skills: (user.freelancerProfile?.skills || []).join(', '),
        hourlyRate: user.freelancerProfile?.hourlyRate || '',
        experience: user.freelancerProfile?.experience || '',
        portfolioUrl: user.freelancerProfile?.portfolioUrl || '',
        companyName: user.clientProfile?.companyName || '',
        industry: user.clientProfile?.industry || '',
      });
    }
  }, [user]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await api.put('/users/profile', {
        ...form,
        skills: form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      });
      await refreshUser();
      setMessage('Your profile details have been saved successfully.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="ACCOUNT SETTINGS"
        title="Profile & Preferences"
        description="Manage your professional presence, portfolio links, and marketplace visibility."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'flex-start' }}>
        {/* Profile Editor Form */}
        <form className="panel" style={{ padding: 32 }} onSubmit={handleSubmit}>
          {/* Avatar and Identity Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div
              className="avatar"
              style={{ width: 64, height: 64, fontSize: 24, borderRadius: 'var(--radius-md)' }}
            >
              {user?.name?.slice(0, 1)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: 18 }}>{user?.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  background: 'var(--primary-light)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  marginTop: 6,
                }}
              >
                {user?.role?.toLowerCase()} account
              </span>
            </div>
          </div>

          {/* Section 1: Basic Info */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Personal Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-field">
                <span>Full name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  maxLength={80}
                />
              </div>

              <div className="form-field">
                <span>About / Biography</span>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  maxLength={2000}
                  placeholder="Share a summary of your professional background, domain expertise, and working style..."
                />
              </div>

              <div className="two-fields">
                <div className="form-field">
                  <span>Location</span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="City, Country"
                  />
                </div>

                <div className="form-field">
                  <span>Personal website</span>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Role-specific details */}
          {isFreelancer ? (
            <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                Freelancer Specialist Profile
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-field">
                  <span>Professional headline</span>
                  <input
                    type="text"
                    value={form.headline}
                    onChange={(e) => update('headline', e.target.value)}
                    maxLength={140}
                    placeholder="e.g. Senior Full-Stack Engineer | React, Node.js & Cloud Architecture"
                  />
                </div>

                <div className="form-field">
                  <span>Skills & technologies</span>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => update('skills', e.target.value)}
                    placeholder="React, Node.js, UI/UX, TypeScript, Python"
                  />
                  <small>Separate skills with commas (e.g. React, Node.js, Figma).</small>
                </div>

                <div className="two-fields">
                  <div className="form-field">
                    <span>Hourly rate (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.hourlyRate}
                      onChange={(e) => update('hourlyRate', e.target.value)}
                      placeholder="e.g. 1500"
                    />
                  </div>

                  <div className="form-field">
                    <span>Years of experience</span>
                    <input
                      type="text"
                      value={form.experience}
                      onChange={(e) => update('experience', e.target.value)}
                      placeholder="e.g. 5+ years"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <span>Portfolio URL</span>
                  <input
                    type="url"
                    value={form.portfolioUrl}
                    onChange={(e) => update('portfolioUrl', e.target.value)}
                    placeholder="https://behance.net/yourprofile or https://github.com/username"
                  />
                </div>
              </div>
            </div>
          ) : isClient ? (
            <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                Company & Organization
              </h3>

              <div className="two-fields">
                <div className="form-field">
                  <span>Company name</span>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                    placeholder="e.g. Acme Tech Labs"
                  />
                </div>

                <div className="form-field">
                  <span>Industry</span>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => update('industry', e.target.value)}
                    placeholder="e.g. SaaS, Fintech, Healthcare"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {message && (
            <div className="success-message" style={{ marginTop: 20 }}>
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          {error && (
            <div className="form-error" style={{ marginTop: 20 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 24 }}>
            <Button type="submit" size="lg" loading={loading}>
              <Save size={16} /> Save Changes
            </Button>
          </div>
        </form>

        {/* Aside Helper Column */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isFreelancer && <TrustScoreCard trustScore={trustScore} />}

          <div className="panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', marginBottom: 10 }}>
              <Sparkles size={18} />
              <strong style={{ fontSize: 14 }}>Profile Completeness</strong>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A complete profile with clear headline, detailed bio, and relevant skills increases your
              profile completeness score and attracts more client invitations.
            </p>
          </div>

          <div className="panel" style={{ padding: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: 6 }}>
              Privacy & Security
            </strong>
            <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Your email address is kept private and never exposed publicly on the marketplace.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
