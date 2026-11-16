import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  HelpCircle,
  Plus,
  ShieldCheck,
  Users,
  X,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { Button, PageHeader } from '../components/Primitives';

const categoryOptions = [
  'Development & IT',
  'Design & Creative',
  'Writing & Content',
  'Business & Consulting',
  'Marketing',
  'Video & Animation',
  'Data & Analytics',
  'Other',
];

const popularSkills = [
  'React',
  'Node.js',
  'TypeScript',
  'UI/UX Design',
  'Figma',
  'Python',
  'Tailwind CSS',
  'Mobile App',
  'Copywriting',
  'Brand Strategy',
];

export default function PostProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    category: categoryOptions[0],
    description: '',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    skills: [],
    teamEnabled: false,
    teamSize: '3',
  });

  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addSkill = (skillToAdd) => {
    const skill = (skillToAdd || skillInput).trim();
    if (
      skill &&
      !form.skills.some((item) => item.toLowerCase() === skill.toLowerCase()) &&
      form.skills.length < 15
    ) {
      update('skills', [...form.skills, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (value) =>
    update('skills', form.skills.filter((skill) => skill !== value));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/projects', {
        ...form,
        budgetMin: Number(form.budgetMin),
        budgetMax: Number(form.budgetMax),
        teamSize: form.teamEnabled ? Number(form.teamSize) : 1,
      });
      navigate('/app/my-projects');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="CLIENT OPPORTUNITIES"
        title="Post a Project"
        description="Specify your project scope, skills, budget parameters, and attract top-tier independent talent."
        action={
          <Link to="/app/my-projects" className="text-link">
            <ArrowLeft size={16} /> Back to projects
          </Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'flex-start' }}>
        {/* Main Post Project Form */}
        <form className="panel" style={{ padding: 32 }} onSubmit={handleSubmit}>
          {/* Section 1: Project Basics */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                01
              </span>
              <div>
                <h2 style={{ fontSize: 16 }}>Project Details & Scope</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Give your project a descriptive title and category.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-field">
                <span>Project title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  minLength={8}
                  maxLength={140}
                  required
                  placeholder="e.g. Build modern interactive SaaS analytics dashboard in React"
                />
                <small>Be concise and specific so experienced freelancers immediately understand your deliverable.</small>
              </div>

              <div className="form-field">
                <span>Category *</span>
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <span>Project description *</span>
                <textarea
                  rows={7}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  minLength={30}
                  maxLength={5000}
                  required
                  placeholder="Describe your project requirements, deliverables, technical stack expectations, timeline constraints, and what a successful completion looks like..."
                />
                <small>Include key deliverables, milestones, tech stacks, and relevant constraints.</small>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          {/* Section 2: Skills & Budget */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                02
              </span>
              <div>
                <h2 style={{ fontSize: 16 }}>Skills, Budget & Timeline</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Define expected skills and set a realistic compensation range.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-field">
                <span>Required skills & technologies</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Type skill name (e.g. React, Figma, Python) and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={() => addSkill()}>
                    <Plus size={16} /> Add
                  </Button>
                </div>

                {/* Popular suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    Popular:
                  </span>
                  {popularSkills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-page)',
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>

                {/* Selected skills tag cloud */}
                {form.skills.length > 0 && (
                  <div className="skill-tags" style={{ marginTop: 12 }}>
                    {form.skills.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(108, 92, 231, 0.2)',
                          fontWeight: 600,
                        }}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          aria-label={`Remove ${skill}`}
                          style={{ color: 'var(--primary)', cursor: 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <small>Select or type up to 15 relevant skill tags.</small>
              </div>

              <div className="two-fields">
                <div className="form-field">
                  <span>Minimum budget (₹) *</span>
                  <input
                    type="number"
                    min="1"
                    max="99999999"
                    value={form.budgetMin}
                    onChange={(e) => update('budgetMin', e.target.value)}
                    required
                    placeholder="10000"
                  />
                </div>
                <div className="form-field">
                  <span>Maximum budget (₹) *</span>
                  <input
                    type="number"
                    min="1"
                    max="99999999"
                    value={form.budgetMax}
                    onChange={(e) => update('budgetMax', e.target.value)}
                    required
                    placeholder="30000"
                  />
                </div>
              </div>

              <div className="form-field">
                <span>Target completion deadline (Optional)</span>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.deadline}
                  onChange={(e) => update('deadline', e.target.value)}
                />
                <small>Freelancers will use this to gauge feasibility when bidding.</small>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          {/* Section 3: Team Collaboration */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                03
              </span>
              <div>
                <h2 style={{ fontSize: 16 }}>Team Collaboration Options</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Enable multi-freelancer collaboration on large projects.</p>
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: 18,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: form.teamEnabled ? 'var(--primary-light)' : 'var(--bg-card-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={form.teamEnabled}
                onChange={(e) => update('teamEnabled', e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--primary)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>
                  <Users size={16} color="var(--primary)" />
                  Enable Shared Team Workspace
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  Assemble multiple specialists (e.g. Designer + Frontend + Backend) in one shared project
                  with Kanban task boards and real-time team messaging.
                </p>
              </div>
            </label>

            {form.teamEnabled && (
              <div className="form-field" style={{ marginTop: 14 }}>
                <span>Team size capacity (Freelancer seats)</span>
                <select
                  value={form.teamSize}
                  onChange={(e) => update('teamSize', e.target.value)}
                >
                  {Array.from({ length: 11 }, (_, i) => i + 2).map((size) => (
                    <option key={size} value={size}>
                      {size} Freelancers
                    </option>
                  ))}
                </select>
                <small>You will be able to invite up to {form.teamSize} specialists into the workspace.</small>
              </div>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, gap: 16, flexWrap: 'wrap' }}>
            <Button type="submit" size="xl" loading={loading}>
              Publish Project Listing <ArrowRight size={17} />
            </Button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Proposals can be reviewed immediately once submitted.
            </span>
          </div>
        </form>

        {/* Sidebar Guidelines */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', marginBottom: 12 }}>
              <Sparkles size={18} />
              <strong style={{ fontSize: 14 }}>Posting Tips</strong>
            </div>
            <ul style={{ paddingLeft: 16, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li style={{ marginBottom: 8 }}>Set a clear, realistic budget range to attract experienced professionals.</li>
              <li style={{ marginBottom: 8 }}>List 3–5 specific technology keywords so search algorithms rank your job.</li>
              <li>Break down the expected outcome into measurable milestones.</li>
            </ul>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', marginBottom: 12 }}>
              <ShieldCheck size={18} />
              <strong style={{ fontSize: 14 }}>Fair Market Terms</strong>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Proposals are non-binding until you explicitly accept an offer. Accepting an offer creates a contract with protected delivery milestones.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
