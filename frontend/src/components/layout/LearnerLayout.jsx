import React, { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, GraduationCap } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const LearnerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [openMenu, setOpenMenu] = useState(false);

  const initials = useMemo(() => {
    const name = user?.name || 'User';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const totalPoints = Number(user?.totalPoints || user?.points || 0);

  const linkClass = (path) =>
    `h-full inline-flex items-center px-1 text-sm font-medium border-b-2 transition-colors ${
      location.pathname.startsWith(path)
        ? 'text-[#2D31D4] border-[#2D31D4]'
        : 'text-gray-600 border-transparent hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/courses" className="inline-flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-[#2D31D4]" />
            <span className="text-xl font-bold font-plus-jakarta-sans text-gray-900">Learnova</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 h-full">
            <Link to="/courses" className={linkClass('/courses')}>
              Courses
            </Link>
            <Link to="/my-courses" className={linkClass('/my-courses')}>
              My Learning
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-3 md:px-4 h-9 rounded-lg border border-[#2D31D4] text-[#2D31D4] text-sm font-medium hover:bg-[#EEF0FF]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-3 md:px-4 h-9 rounded-lg bg-[#2D31D4] text-white text-sm font-medium hover:bg-blue-800"
                >
                  Get Started →
                </button>
              </>
            ) : (
              <>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  ⭐ {totalPoints} pts
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((prev) => !prev)}
                    className="inline-flex items-center gap-1"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2D31D4] text-white flex items-center justify-center text-sm font-bold">
                      {initials}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {openMenu ? (
                    <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(false);
                          navigate('/my-courses');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Courses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(false);
                          navigate('/profile');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Profile
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(false);
                          clearAuth();
                          toast('See you next time! 👋', { icon: '👋' });
                          navigate('/login');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default LearnerLayout;
