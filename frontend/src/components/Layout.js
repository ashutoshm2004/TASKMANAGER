import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/projects', icon: '◈', label: 'Projects' },
  { to: '/my-tasks', icon: '◎', label: 'My Tasks' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 220,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>TF</div>
          {!collapsed && <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap' }}>TaskFlow</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8, fontWeight: 600, fontSize: 14,
              color: isActive ? '#fff' : 'var(--text2)',
              background: isActive ? 'var(--primary)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: collapsed ? '12px 0' : '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, truncate: true, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.role}</div>
            </div>
          )}
          {!collapsed && (
            <button className="btn-icon" onClick={handleLogout} title="Logout" style={{ flexShrink: 0 }}>⏻</button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text2)', padding: '8px',
            borderRadius: 0, fontSize: 14,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
