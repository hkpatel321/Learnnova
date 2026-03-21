import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, LogOut, Mail, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const getInitials = (name) =>
  (name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const points = Number(user?.totalPoints || user?.points || 0);
  const role = (user?.role || 'learner').toString();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2D31D4] text-white flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">{user?.name || 'Learner'}</p>
            <p className="text-sm text-gray-500">Welcome back to Learnova</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
            <p className="mt-2 text-sm text-gray-900 inline-flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {user?.email || 'Not available'}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Role</p>
            <p className="mt-2 text-sm text-gray-900 inline-flex items-center gap-2 capitalize">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              {role}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Points</p>
            <p className="mt-2 text-sm text-gray-900 inline-flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              {points}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Account</p>
            <p className="mt-2 text-sm text-gray-900 inline-flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Active
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/my-courses')}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to My Courses
          </button>

          <button
            type="button"
            onClick={() => {
              clearAuth();
              toast('Logged out successfully', { icon: '👋' });
              navigate('/login');
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 inline-flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
