import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ dark = false, compact = false }) {
  return (
    <Link className={`brand ${dark ? 'brand-dark' : ''}`} to="/" aria-label="FreelanceHub Home">
      <span className="brand-mark">
        <Briefcase size={compact ? 18 : 20} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span>
          Freelance<span className="brand-accent">Hub</span>
        </span>
      )}
    </Link>
  );
}
