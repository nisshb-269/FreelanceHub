import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  MapPin,
  Search,
  Star,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import {
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchField,
} from '../components/Primitives';
import TrustScoreCard from '../components/TrustScoreCard';

export default function FreelancersPage({ publicMode = false }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFreelancers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/freelancers', {
        params: { q: query.trim() || undefined },
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
    loadFreelancers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadFreelancers();
  };

  return (
    <div className={publicMode ? 'public-listing-page' : ''}>
      {publicMode ? (
        <div className="public-listing-head">
          <div className="eyebrow">TALENT DIRECTORY</div>
          <h1>Discover world-class independent specialists</h1>
          <p>
            Connect with skilled developers, designers, writers, and strategists backed by verified
            TrustScores and real client ratings.
          </p>
        </div>
      ) : (
        <PageHeader
          eyebrow="TALENT DIRECTORY"
          title="Find Freelance Talent"
          description="Browse profiles, review past client ratings, inspect TrustScores, and assemble your next project team."
        />
      )}

      {/* Search Toolbar */}
      <div className="panel" style={{ padding: 18, marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search talent by name, headline, or expertise (e.g. React, UX, Branding)..."
            />
          </div>
          <Button type="submit" size="md">
            Search Talent <Search size={16} />
          </Button>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                api.get('/users/freelancers').then(({ data }) => setItems(data.items || []));
              }}
              style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <LoadingState message="Searching for verified talent..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={User}
            title="No freelancers found"
            description="Try searching with a broader keyword or resetting your filter criteria."
          />
        </div>
      ) : (
        <div className="freelancer-grid">
          {items.map((person) => (
            <article className="freelancer-card" key={person.id}>
              <div className="freelancer-card-head">
                <span className="avatar freelancer-avatar">
                  {person.name?.slice(0, 1)?.toUpperCase() || 'F'}
                </span>
                {person.isVerified ? (
                  <span className="verified-pill">
                    <BadgeCheck size={14} /> Verified Pro
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Community Member</span>
                )}
              </div>

              <h3>{person.name}</h3>
              <p className="freelancer-headline">
                {person.freelancerProfile?.headline || 'Independent Specialist'}
              </p>

              <div className="freelancer-rating">
                <Star size={15} fill="#F59E0B" color="#F59E0B" />
                <strong>{Number(person.averageRating || 0).toFixed(1)}</strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  ({person.reviewCount || 0} reviews)
                </span>
              </div>

              {/* Compact TrustScore Badge */}
              <TrustScoreCard trustScore={person.trustScore} compact />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '12px 0',
                }}
              >
                {person.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color="var(--text-muted)" /> {person.location}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={13} color="var(--text-muted)" />{' '}
                  {person.freelancerProfile?.completedJobs || 0} projects delivered
                </span>
              </div>

              <div className="skill-tags">
                {(person.freelancerProfile?.skills || []).slice(0, 4).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>

              <div className="freelancer-card-bottom">
                <div>
                  <small>Hourly Rate</small>
                  <strong>
                    {person.freelancerProfile?.hourlyRate
                      ? `₹${Number(person.freelancerProfile.hourlyRate).toLocaleString('en-IN')} / hr`
                      : 'Negotiable'}
                  </strong>
                </div>

                <Link to={`/freelancers/${person.id}`} className="text-link">
                  View Profile <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
