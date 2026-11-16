import { useEffect } from 'react';
import { Loader2, Search, Sparkles, X } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Loader2 className="spin" size={17} /> : children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'purple' }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className={`stat-icon ${tone}`}>
            <Icon size={20} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={26} strokeWidth={2} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <label className={`search-field ${className}`}>
      <Search size={17} strokeWidth={2.2} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function StatusPill({ value }) {
  const raw = String(value || 'PENDING');
  const normalizedClass = raw.toLowerCase();
  const label = raw
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return <span className={`status-pill status-${normalizedClass}`}>{label}</span>;
}

export function LoadingState({ message = 'Loading workspace...' }) {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={26} strokeWidth={2.2} />
      <span>{message}</span>
    </div>
  );
}

export function Field({ label, hint, error, ...props }) {
  return (
    <label className="form-field">
      {label && <span>{label}</span>}
      <input {...props} />
      {hint && !error && <small>{hint}</small>}
      {error && <small style={{ color: 'var(--danger)' }}>{error}</small>}
    </label>
  );
}

export function Modal({ isOpen, onClose, title, subtitle, children, wide = false }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal-card ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        {title && <h2>{title}</h2>}
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'primary' }) {
  return <span className={`category-tag tag-${variant}`}>{children}</span>;
}
