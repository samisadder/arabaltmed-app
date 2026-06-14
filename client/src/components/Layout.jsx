import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { api, logout } from '../lib/api.js';

const s = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
  },
  sidebar: {
    width: 240,
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarTop: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  brandName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  brandSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'all 0.15s',
    marginBottom: 2,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.08)',
    color: '#f1f5f9',
  },
  sidebarBottom: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  adminName: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    paddingLeft: 12,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'color 0.15s',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  topbar: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  topbarTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  content: {
    flex: 1,
    padding: '28px',
  },
};

export default function Layout({ children, title }) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    api.me().then((d) => setAdminName(d.admin.name)).catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <p style={s.brandName}>ArabAltMed</p>
          <p style={s.brandSub}>Invoice Portal</p>
        </div>
        <nav style={s.nav}>
          <NavLink
            to="/admin/dashboard"
            style={({ isActive }) => ({
              ...s.navItem,
              ...(isActive ? s.navItemActive : {}),
            })}
          >
            <span>📄</span> Invoices
          </NavLink>
          <NavLink
            to="/admin/settings"
            style={({ isActive }) => ({
              ...s.navItem,
              ...(isActive ? s.navItemActive : {}),
            })}
          >
            <span>⚙️</span> Settings
          </NavLink>
        </nav>
        <div style={s.sidebarBottom}>
          {adminName && <p style={s.adminName}>{adminName}</p>}
          <button style={s.logoutBtn} onClick={handleLogout}>
            <span>→</span> Sign out
          </button>
        </div>
      </aside>

      <div style={s.main}>
        <header style={s.topbar}>
          <h1 style={s.topbarTitle}>{title}</h1>
        </header>
        <main style={s.content}>{children}</main>
      </div>
    </div>
  );
}
