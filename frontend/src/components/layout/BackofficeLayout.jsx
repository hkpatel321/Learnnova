import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Book, BarChart2, LogOut, GraduationCap, ChevronDown } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const BackofficeLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    clearAuth();
    toast('See you next time! 👋', { icon: '👋' });
    navigate('/login');
  };

  const navLinks = [
    { name: 'Courses', path: '/backoffice/courses', icon: <Book className="w-5 h-5 mr-3" /> },
    { name: 'Reporting', path: '/backoffice/reporting', icon: <BarChart2 className="w-5 h-5 mr-3" /> },
  ];

  const pageTitle = navLinks.find(link => location.pathname.includes(link.path))?.name || 'Dashboard';

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex h-screen bg-[#F4F5FF] font-inter overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E5E7EB] z-20 flex-col">
        {/* Top Logo */}
        <div className="flex items-center gap-2 p-6">
          <GraduationCap className="w-8 h-8 text-[#2D31D4]" />
          <span className="text-xl font-bold font-plus-jakarta-sans tracking-tight text-[#2D31D4]">Learnova</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 mt-2 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#EEF0FF] text-[#2D31D4] border-l-[3px] border-[#2D31D4]' 
                    : 'text-gray-600 hover:bg-[#F4F5FF] hover:text-gray-900 border-l-[3px] border-transparent'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile / Logout */}
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-[#2D31D4] text-white flex items-center justify-center font-bold flex-shrink-0">
              {userInitials}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User Name'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'Instructor'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-60 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 z-40">
          <h1 className="text-[18px] font-bold text-gray-900 font-plus-jakarta-sans">{pageTitle}</h1>
          
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#EEF0FF] text-[#2D31D4] flex items-center justify-center font-bold text-sm">
                {userInitials}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-[70]">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User Name'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Profile Settings
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 mb-16 md:mb-0">
          <Outlet />
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 pb-safe">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-[#2D31D4]' : 'text-gray-500'
                }`}
              >
                {React.cloneElement(link.icon, { className: 'w-5 h-5 mr-0' })}
                <span className="text-[10px] font-medium">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BackofficeLayout;