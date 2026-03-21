import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Initials avatar ─────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center
                    text-white text-xs font-bold select-none flex-shrink-0">
      {initials}
    </div>
  );
}

// ── User Dropdown ───────────────────────────────────────────────────────────
function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-lg px-2 py-1
                   hover:bg-brand-light transition-colors"
      >
        <Avatar name={user.name} />
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {user.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200
                        bg-white shadow-lg py-1 z-50 animate-fade-in">
          <button
            onClick={() => { setOpen(false); navigate('/my-courses'); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700
                       hover:bg-brand-light hover:text-brand transition-colors"
          >
            My Courses
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2 text-sm text-red-500
                       hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

// ── Navbar ──────────────────────────────────────────────────────────────────
/**
 * Props:
 *  searchSlot – optional React element rendered in the center of the navbar.
 *               When provided, nav links are hidden so the search takes focus.
 */
export default function Navbar({ searchSlot }) {
  const { user, isLoggedIn, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `text-sm font-medium pb-1 border-b-2 transition-colors ${
      isActive
        ? 'text-brand border-brand'
        : 'text-gray-600 border-transparent hover:text-brand hover:border-brand'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-brand/30 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16
                      flex items-center gap-4">

        {/* ── Logo ── */}
        <Link
          to="/courses"
          className="text-xl font-bold text-brand tracking-tight flex-shrink-0
                     font-serif"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Learnova
        </Link>

        {/* ── Center: search slot (priority) or nav links ── */}
        <div className="flex items-center gap-6 flex-1 justify-center">
          {searchSlot ? (
            /* Search bar dominates center when provided */
            <div className="w-full max-w-sm">{searchSlot}</div>
          ) : (
            /* Default: show nav links */
            <>
              <NavLink to="/courses"    className={linkClass}>Explore</NavLink>
              {isLoggedIn && (
                <NavLink to="/my-courses" className={linkClass}>My Courses</NavLink>
              )}
            </>
          )}
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* If search is in center, keep a tiny Explore link here too */}
          {searchSlot && (
            <NavLink
              to="/courses"
              className="hidden sm:block text-sm font-medium text-brand
                         hover:underline"
            >
              Explore
            </NavLink>
          )}

          {isLoggedIn && user ? (
            <UserDropdown user={user} onLogout={logout} />
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-brand hover:underline"
              >
                Sign In
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
