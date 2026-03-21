import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Courses',
    path: '/admin/courses',
    roles: ['admin', 'instructor'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: 'Reporting',
    path: '/admin/reporting',
    roles: ['admin', 'instructor'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Users',
    path: '/admin/users',
    roles: ['admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },

];

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role;

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-30 flex flex-col
                  bg-[#0f172a] transition-all duration-300 overflow-hidden
                  ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}
    >
      {/* ── Logo area ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-white text-xl font-bold tracking-tight"
                  style={{ fontFamily: "'Fraunces', serif" }}>
              Learnova
            </span>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-brand/20 text-brand text-[10px] font-bold uppercase tracking-wider w-fit">
              {role === 'admin' ? 'Admin' : 'Instructor'}
            </span>
          </div>
        )}
        {collapsed && (
          <span className="text-white text-lg font-bold mx-auto"
                style={{ fontFamily: "'Fraunces', serif" }}>
            L
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="mx-3 mb-4 p-1.5 rounded-lg text-gray-400 hover:text-white
                   hover:bg-white/10 transition-colors flex-shrink-0 self-end"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
        </svg>
      </button>

      <div className="mx-3 border-t border-white/10 mb-3 flex-shrink-0" />

      {/* ── Nav links ─────────────────────────────────────────── */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS
          .filter(item => item.roles.includes(role))
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 transition-all duration-150 group
                 ${isActive
                   ? 'bg-brand text-white shadow-lg shadow-brand/20'
                   : 'text-gray-400 hover:text-white hover:bg-white/10'}`
              }
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
      </nav>

      {/* ── Bottom user section ───────────────────────────────── */}
      <div className="flex-shrink-0 p-3 mt-auto border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/30 flex items-center justify-center
                          text-brand text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <button
                onClick={onLogout}
                className="text-gray-400 text-xs hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function Header({ title, user }) {
  return (
    <header className="sticky top-0 z-20 h-[60px] bg-white border-b-2 border-brand
                        flex items-center justify-between px-6">
      <h1 className="text-lg font-bold text-gray-900 tracking-tight"
          style={{ fontFamily: "'Fraunces', serif" }}>
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-brand
                           hover:bg-brand/5 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center
                          text-white text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
}

// ── AdminLayout (wraps all admin pages) ──────────────────────────────────────
export default function AdminLayout({ title = 'Dashboard' }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar user={user} onLogout={logout} />

      <div className="ml-[240px] transition-all duration-300">
        <Header title={title} user={user} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
