import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Code2,
  Compass,
  FileCheck2,
  Layers,
  Lock,
  Megaphone,
  Palette,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  Wallet,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import { Button } from '../components/Primitives';

const categories = [
  { name: 'Development & IT', jobs: '2,450+ projects', icon: Code2, tone: 'purple' },
  { name: 'Design & Creative', jobs: '1,890+ projects', icon: Palette, tone: 'orange' },
  { name: 'Writing & Translation', jobs: '980+ projects', icon: PenTool, tone: 'green' },
  { name: 'Business & Consulting', jobs: '740+ projects', icon: Briefcase, tone: 'blue' },
  { name: 'Marketing & Sales', jobs: '620+ projects', icon: Megaphone, tone: 'purple' },
  { name: 'Video & Animation', jobs: '410+ projects', icon: Video, tone: 'orange' },
  { name: 'AI & Data Science', jobs: '530+ projects', icon: Layers, tone: 'green' },
  { name: 'Product Management', jobs: '320+ projects', icon: Compass, tone: 'blue' },
];

const sampleProjects = [
  {
    title: 'Architect modern SaaS landing page and interactive component system',
    category: 'Design & Creative',
    skills: ['Figma', 'UI/UX', 'Design System'],
    budget: '₹25,000 – ₹45,000',
    proposals: 8,
    client: 'Starlight Labs',
  },
  {
    title: 'Full-stack React & Node.js application with PostgreSQL database integration',
    category: 'Development & IT',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Prisma'],
    budget: '₹40,000 – ₹75,000',
    proposals: 14,
    client: 'HyperScale Fintech',
  },
  {
    title: 'Comprehensive Brand Identity, Style Guide & Typography for D2C Brand',
    category: 'Design & Creative',
    skills: ['Brand Identity', 'Typography', 'Illustrator'],
    budget: '₹18,000 – ₹30,000',
    proposals: 6,
    client: 'Nectar Botanicals',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/projects?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate('/projects');
    }
  };

  return (
    <div className="marketing-page">
      {/* Top Navigation */}
      <header className="marketing-nav">
        <Brand />
        <nav aria-label="Marketing Navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#categories">Explore categories</a>
          <Link to="/projects">Find projects</Link>
          <Link to="/freelancers">Browse talent</Link>
        </nav>
        <div className="nav-auth">
          <Link to="/login" className="nav-login">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-primary btn-md">
            Join FreelanceHub <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="kicker-dot" />
                WHERE TALENT MEETS OPPORTUNITY
              </div>
              <h1>
                Work with top independent <span>talent worldwide.</span>
              </h1>
              <p className="hero-description">
                FreelanceHub gives companies and skilled freelancers the platform to build
                meaningful projects together—backed by verified TrustScores and milestone-protected contracts.
              </p>

              <form className="hero-search-bar" onSubmit={handleHeroSearch}>
                <Search size={18} color="var(--text-muted)" style={{ marginRight: 8 }} />
                <input
                  type="text"
                  placeholder="Try 'React developer', 'Brand identity', or 'Mobile UI'..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                />
                <Button type="submit" size="md">
                  Search
                </Button>
              </form>

              <div className="hero-actions" style={{ marginTop: 24 }}>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Hire top talent <ArrowRight size={16} />
                </Link>
                <Link to="/projects" className="btn btn-secondary btn-lg">
                  Find freelance work
                </Link>
              </div>

              <div className="hero-proof">
                <div className="avatar-stack">
                  <span>AK</span>
                  <span>PS</span>
                  <span>RM</span>
                  <span>+</span>
                </div>
                <div>
                  <div className="proof-stars">
                    <span>★★★★★</span> <strong>4.9 / 5.0 Rating</strong>
                  </div>
                  <small>Trusted by thousands of clients and verified specialists.</small>
                </div>
              </div>
            </div>

            {/* Hero Visual Preview Card */}
            <div className="hero-visual">
              <div className="hero-card-preview">
                <div className="hero-card-header">
                  <div>
                    <span className="eyebrow" style={{ marginBottom: 2 }}>COLLABORATION WORKSPACE</span>
                    <h3 style={{ fontSize: 16 }}>E-Commerce Redesign & React App</h3>
                  </div>
                  <span className="hero-live-pill">In Progress</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="avatar">JD</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Jordan Davis</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tech Lead · Client Partner</div>
                  </div>
                  <BadgeCheck size={18} color="var(--success)" />
                </div>

                <div style={{ margin: '14px 0 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Milestone delivery progress</span>
                    <strong style={{ color: 'var(--primary)' }}>75% completed</strong>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-page)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg, #6C5CE7, #4338CA)', borderRadius: 9999 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={15} color="var(--success)" />
                    <span>User research & wireframes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={15} color="var(--success)" />
                    <span>High-fidelity responsive UI prototypes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-main)', fontWeight: 600 }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid var(--primary)', display: 'inline-block' }} />
                    <span>React frontend component delivery</span>
                  </div>
                </div>
              </div>

              <div className="hero-feature-pill feature-pill-top">
                <Zap size={18} color="var(--primary)" />
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-main)' }}>TrustScore 96 / 100</strong>
                  <small style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>Top Rated Specialist</small>
                </div>
              </div>

              <div className="hero-feature-pill feature-pill-bottom">
                <ShieldCheck size={18} color="var(--success)" />
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-main)' }}>Protected Milestones</strong>
                  <small style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>Transparent Escrow Delivery</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="section" id="categories">
          <div className="section-heading">
            <div>
              <div className="eyebrow">BROWSE BY EXPERTISE</div>
              <h2>Explore popular categories</h2>
              <p>Discover skilled professionals and active projects across high-demand disciplines.</p>
            </div>
            <Link to="/projects" className="text-link">
              View all categories <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="category-grid">
            {categories.map(({ name, jobs, icon: Icon, tone }) => (
              <Link to="/projects" className="category-card" key={name}>
                <span className={`category-icon ${tone}`}>
                  <Icon size={24} strokeWidth={2} />
                </span>
                <strong>{name}</strong>
                <small>{jobs}</small>
                <ArrowUpRight className="category-arrow" size={17} />
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Projects Showcase */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div>
              <div className="eyebrow">OPPORTUNITIES FOR SPECIALISTS</div>
              <h2>Featured projects accepting proposals</h2>
              <p>Top clients seeking experienced talent for impactful projects.</p>
            </div>
            <Link to="/projects" className="text-link">
              Explore marketplace <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="featured-grid">
            {sampleProjects.map((project) => (
              <article className="featured-card" key={project.title}>
                <div className="featured-card-head">
                  <span className="category-tag">{project.category}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>
                    ● Open
                  </span>
                </div>
                <h3>{project.title}</h3>
                <div className="skill-tags">
                  {project.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
                <div className="featured-card-bottom">
                  <div>
                    <small>Project Budget</small>
                    <strong>{project.budget}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {project.proposals} proposals
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works Dark Section */}
        <section className="how-section" id="how-it-works">
          <div className="how-container">
            <div className="how-content">
              <div className="eyebrow eyebrow-light">SIMPLE BY DESIGN</div>
              <h2>
                How FreelanceHub <span>powers your projects.</span>
              </h2>
              <p>
                From initial posting to final deliverable sign-off, our structured workflows ensure
                fair terms, clear expectations, and timely delivery.
              </p>

              <div className="how-steps">
                <div className="how-step">
                  <span className="how-step-num">01</span>
                  <strong>Discover & Connect</strong>
                  <small>Post projects or discover opportunities matching your verified skills.</small>
                </div>
                <div className="how-step">
                  <span className="how-step-num">02</span>
                  <strong>Collaborate with Ease</strong>
                  <small>Agree on milestones, manage tasks in shared boards, and chat in real time.</small>
                </div>
                <div className="how-step">
                  <span className="how-step-num">03</span>
                  <strong>Deliver & Build Trust</strong>
                  <small>Submit completed files, approve milestones, and build your TrustScore.</small>
                </div>
              </div>

              <Link to="/register" className="btn btn-white btn-xl">
                Get started today <ArrowRight size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', placeItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: 380,
                  padding: 32,
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--primary)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#FFF',
                    }}
                  >
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>Full-Cycle Delivery</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Guaranteed milestones & clarity</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', fontSize: 12.5, color: '#E2E8F0' }}>
                    ✓ Escrow-style milestone funding verification
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', fontSize: 12.5, color: '#E2E8F0' }}>
                    ✓ Multi-specialist collaborative team workspaces
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', fontSize: 12.5, color: '#E2E8F0' }}>
                    ✓ Objective TrustScore based on actual deliveries
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Trust & Reputation Bar */}
        <section className="trust-section">
          <div className="trust-item">
            <span className="trust-icon">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>Protected Agreements</strong>
              <small>Milestone-based delivery cycles keep expectations aligned.</small>
            </div>
          </div>

          <div className="trust-item">
            <span className="trust-icon">
              <Users size={22} />
            </span>
            <div>
              <strong>Collaborative Teams</strong>
              <small>Assemble multi-disciplinary teams with shared task boards and chat.</small>
            </div>
          </div>

          <div className="trust-item">
            <span className="trust-icon">
              <Star size={22} />
            </span>
            <div>
              <strong>Algorithmic TrustScore</strong>
              <small>Reputation scores generated objectively from verified contract completion.</small>
            </div>
          </div>
        </section>
      </main>

      {/* Modern SaaS Footer */}
      <footer className="marketing-footer">
        <div className="marketing-footer-inner">
          <Brand />
          <span>© {new Date().getFullYear()} FreelanceHub. All rights reserved.</span>
          <div className="marketing-footer-links">
            <Link to="/projects">Projects</Link>
            <Link to="/freelancers">Freelancers</Link>
            <Link to="/login">Sign In</Link>
            <a href="mailto:support@freelancehub.example">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
