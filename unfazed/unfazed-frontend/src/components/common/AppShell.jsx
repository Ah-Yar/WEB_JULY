import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  { to: '/app/dashboard', icon: '⌂', label: 'Overview' },
  { to: '/app/analytics', icon: '◒', label: 'Analytics & plan' },
  { to: '/app/profile', icon: '◐', label: 'Public profile' },
  { to: '/app/availability', icon: '◷', label: 'Availability' },
  { to: '/app/schedule', icon: '▦', label: 'Schedule' },
  { to: '/app/clients', icon: '♧', label: 'Clients' },
  { to: '/app/billing', icon: '₹', label: 'Payments & packages' },
  { to: '/app/notes', icon: '✎', label: 'Clinical notes' },
  { to: '/app/messages', icon: '◌', label: 'Messages' }
];

export default function AppShell({ title, eyebrow, children, action }) {
  const { therapist, logout } = useAuth();
  const navigate = useNavigate();
  const leave = () => { logout(); navigate('/login'); };
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/app/dashboard" className="brand brand--dark"><i>u</i><span>unfazed</span></NavLink>
      <div className="sidebar__label">PRACTICE SPACE</div>
      <nav>{navItems.map((item) => <NavLink key={item.to} to={item.to} className="sidebar__link"><b>{item.icon}</b>{item.label}</NavLink>)}</nav>
      <div className="sidebar__bottom">
        <a className="public-link" href={`/${therapist?.slug}`} target="_blank" rel="noreferrer">↗ View public page</a>
        <div className="account-chip"><div className="avatar avatar--small">{therapist?.name?.slice(0, 1) || 'T'}</div><span><strong>{therapist?.name || 'Therapist'}</strong><small>{therapist?.subscription?.tierKey ? `${therapist.subscription.tierKey[0].toUpperCase()}${therapist.subscription.tierKey.slice(1)} plan` : 'Starter plan'}</small></span></div>
        <button type="button" className="logout" onClick={leave}>Sign out</button>
      </div>
    </aside>
    <main className="app-main">
      <header className="app-header"><div><p className="eyebrow">{eyebrow || 'YOUR PRACTICE'}</p><h1>{title}</h1></div>{action}</header>
      {children}
    </main>
  </div>;
}
