import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Briefcase,
  ChevronDown,
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/Brand';
import api from '../services/api';

const navByRole = {
  FREELANCER: [
    { label: 'Overview', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'SmartMatch', to: '/app/smartmatch', icon: Sparkles },
    { label: 'Find projects', to: '/app/find-projects', icon: Compass },
    { label: 'Saved projects', to: '/app/saved-projects', icon: Bookmark },
    { label: 'My proposals', to: '/app/proposals', icon: FileText },
    { label: 'My contracts', to: '/app/contracts', icon: FolderKanban },
    { label: 'Team projects', to: '/app/teams', icon: Users },
    { label: 'Messages', to: '/app/messages', icon: MessageCircle },
    { label: 'Reviews', to: '/app/reviews', icon: Star },
  ],
  CLIENT: [
    { label: 'Overview', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'My projects', to: '/app/my-projects', icon: FolderKanban },
    { label: 'Post a project', to: '/app/post-project', icon: Plus },
    { label: 'Find freelancers', to: '/app/find-freelancers', icon: Search },
    { label: 'My contracts', to: '/app/contracts', icon: FileText },
    { label: 'Team projects', to: '/app/teams', icon: Users },
    { label: 'Messages', to: '/app/messages', icon: MessageCircle },
    { label: 'Reviews', to: '/app/reviews', icon: Star },
  ],
  ADMIN: [
    { label: 'Overview', to: '/app/dashboard', icon: LayoutDashboard },
    { label: 'User management', to: '/app/admin/users', icon: Users },
    { label: 'Project monitoring', to: '/app/admin/projects', icon: FolderKanban },
    { label: 'Dispute management', to: '/app/admin/disputes', icon: ShieldCheck },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/notifications')
      .then(({ data }) => {
        if (isMounted) setUnread(data.unread || 0);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const items = navByRole[user?.role] || [];
  const roleClass = user?.role ? user.role.toLowerCase() : 'freelancer';
  const roleBadgeLabel =
    user?.role === 'FREELANCER'
      ? 'Freelancer Workspace'
      : user?.role === 'CLIENT'
      ? 'Client Workspace'
      : 'Admin Console';

  const signOut = () => {
    logout();
    navigate('/');
  };

  const currentItem = items.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
  const currentSection =
    currentItem?.label ||
    (pathname.startsWith('/app/admin')
      ? 'Administration'
      : pathname.includes('/app/profile')
      ? 'My profile'
      : pathname.includes('/app/notifications')
      ? 'Notifications'
      : 'Workspace');

  return (
    <div className="app-shell">
      {/* Mobile Drawer Scrim */}
      {mobileOpen && (
        <div
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Deep Navy Linear-Style Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Brand dark />
          </div>
          <div className={`workspace-badge ${roleClass}`}>
            <span className="workspace-badge-dot" />
            <span>{roleBadgeLabel}</span>
          </div>
        </div>

        <nav className="side-nav">
          <div className="nav-caption">WORKSPACE</div>
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="nav-caption nav-caption-space">ACCOUNT & SYSTEM</div>
          <NavLink
            to="/app/profile"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UserRound size={18} strokeWidth={2} />
            <span>My profile</span>
          </NavLink>
          <NavLink
            to="/app/notifications"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Bell size={18} strokeWidth={2} />
            <span>Notifications</span>
            {unread > 0 && <span className="nav-count">{unread}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <strong>Need assistance?</strong>
            <p>Reach out to platform support for assistance with projects or contracts.</p>
            <a href="mailto:support@freelancehub.example">support@freelancehub.example ↗</a>
          </div>

          <div className="sidebar-user-row">
            <span className="avatar avatar-small">
              {user?.name?.slice(0, 1)?.toUpperCase() || 'U'}
            </span>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Member'}</div>
              <div className="sidebar-user-role">{user?.role?.toLowerCase()}</div>
            </div>
          </div>

          <button className="logout-link" onClick={signOut}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main App Container */}
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="topbar-breadcrumb">
              <span>FreelanceHub</span>
              <span className="crumb-slash">/</span>
              <strong>{currentSection}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <NavLink
              to="/app/notifications"
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </NavLink>

            <NavLink to="/app/profile" className="user-menu">
              <span className="avatar">
                {user?.name?.slice(0, 1)?.toUpperCase() || 'U'}
              </span>
              <div className="user-menu-text">
                <strong>{user?.name || 'Member'}</strong>
                <small>{user?.role?.toLowerCase()}</small>
              </div>
              <ChevronDown size={15} color="var(--text-muted)" />
            </NavLink>
          </div>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
