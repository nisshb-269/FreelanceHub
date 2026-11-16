import { useEffect, useState } from 'react';
import { Bookmark, Briefcase, Calendar, IndianRupee, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { Button, EmptyState, LoadingState, PageHeader } from '../components/Primitives';

export default function SavedProjectsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/projects/saved');
      setItems(data.items || []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/save`);
      setItems((current) => current.filter((item) => item.projectId !== projectId));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="SHORTLISTED OPPORTUNITIES"
        title="Saved Projects"
        description="Keep promising client projects organized in your private shortlist and return when you are ready to submit a proposal."
      />

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <LoadingState message="Loading saved projects..." />
      ) : items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <EmptyState
            icon={Bookmark}
            title="Your shortlist is empty"
            description="Bookmark open marketplace projects that match your skills to track them here."
            action={
              <Link to="/app/find-projects" className="btn btn-primary">
                Explore projects <Briefcase size={16} />
              </Link>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(({ project }) => (
            <article
              key={project.id}
              className="panel"
              style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="category-tag">{project.category}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>● Open for bids</span>
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
                    <strong>Budget:</strong> ₹{Number(project.budgetMin).toLocaleString('en-IN')} – ₹{Number(project.budgetMax).toLocaleString('en-IN')}
                  </span>
                  <span>
                    <strong>Proposals:</strong> {project._count?.proposals || 0} submitted
                  </span>
                  {project.deadline && (
                    <span>
                      <strong>Deadline:</strong> {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to="/app/find-projects" className="btn btn-primary btn-sm">
                  View marketplace <ArrowRight size={14} />
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => remove(project.id)}
                  title="Remove from shortlist"
                >
                  <Trash2 size={15} /> Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
