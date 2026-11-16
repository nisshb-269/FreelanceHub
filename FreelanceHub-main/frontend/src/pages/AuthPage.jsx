import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/Brand';
import { Button } from '../components/Primitives';
import { errorMessage } from '../services/api';

export default function AuthPage({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FREELANCER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate('/app/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Feature Column (Linear / Stripe inspired dark panel) */}
      <div className="auth-left">
        <div>
          <Brand dark />
        </div>

        <div className="auth-message">
          <div className="eyebrow eyebrow-light">
            <Sparkles size={13} style={{ display: 'inline', marginRight: 4 }} />
            JOIN THE PROFESSIONAL NETWORK
          </div>
          <h1>
            Where meaningful work <span>comes to life.</span>
          </h1>
          <p>
            Connect with clients looking for verified skills, manage multi-milestone
            deliveries, and build an authentic reputation backed by your TrustScore.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <ShieldCheck size={20} />
              <div>
                <strong>Milestone-Protected Contracts</strong>
                <small>Secure delivery agreements with clear acceptance terms.</small>
              </div>
            </div>

            <div className="auth-feature-item">
              <CheckCircle2 size={20} />
              <div>
                <strong>Algorithmic TrustScore</strong>
                <small>Stand out based on on-time delivery and verified client ratings.</small>
              </div>
            </div>

            <div className="auth-feature-item">
              <Briefcase size={20} />
              <div>
                <strong>Team Collaboration Spaces</strong>
                <small>Join or assemble project teams with Kanban boards and real-time chat.</small>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          © {new Date().getFullYear()} FreelanceHub Inc. Where Talent Meets Opportunity.
        </div>
      </div>

      {/* Right Form Column */}
      <div className="auth-right">
        <Link className="auth-back" to="/">
          ← Back to homepage
        </Link>

        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <div className="eyebrow">
              {isLogin ? 'ACCOUNT ACCESS' : 'START YOUR JOURNEY'}
            </div>
            <h2>{isLogin ? 'Sign in to FreelanceHub' : 'Create your account'}</h2>
            <p>
              {isLogin
                ? 'Welcome back. Access your projects, proposals, and contracts.'
                : 'Join our community as a client or independent specialist.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-field">
                <span>Full name</span>
                <div className="input-icon">
                  <User size={18} />
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>
              </div>
            )}

            <div className="form-field">
              <span>Email address</span>
              <div className="input-icon">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <span>Password</span>
              <div className="input-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
                  minLength={8}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="form-field">
                <span>I want to register as</span>
                <div className="role-choice">
                  <button
                    type="button"
                    className={form.role === 'FREELANCER' ? 'selected' : ''}
                    onClick={() => update('role', 'FREELANCER')}
                  >
                    <User size={18} color="var(--primary)" />
                    <strong>Freelancer</strong>
                    <small>Discover projects, send proposals & grow your career</small>
                  </button>

                  <button
                    type="button"
                    className={form.role === 'CLIENT' ? 'selected' : ''}
                    onClick={() => update('role', 'CLIENT')}
                  >
                    <Briefcase size={18} color="var(--primary)" />
                    <strong>Client</strong>
                    <small>Post projects, hire specialists & manage teams</small>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="auth-submit"
              size="xl"
              loading={loading}
            >
              {isLogin ? 'Sign in to workspace' : 'Create account'} <ArrowRight size={17} />
            </Button>
          </form>

          <p className="auth-switch">
            {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
            <Link to={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </Link>
          </p>

          <div className="auth-terms">
            By continuing, you agree to FreelanceHub's terms of service, marketplace policies, and privacy principles.
          </div>
        </div>
      </div>
    </div>
  );
}
