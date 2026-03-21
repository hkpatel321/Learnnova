import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import CourseCard from '../../components/course/CourseCard';

const badgeLevels = [
  { name: 'Newbie', min: 0, max: 20, emoji: '🥈', color: 'text-gray-600' },
  { name: 'Explorer', min: 21, max: 40, emoji: '🥉', color: 'text-blue-600' },
  { name: 'Achiever', min: 41, max: 60, emoji: '🏅', color: 'text-green-600' },
  { name: 'Specialist', min: 61, max: 80, emoji: '🎖️', color: 'text-purple-600' },
  { name: 'Expert', min: 81, max: 100, emoji: '🏆', color: 'text-amber-500' },
  { name: 'Master', min: 101, max: Number.POSITIVE_INFINITY, emoji: '👑', color: 'text-red-600' },
];

const getBadge = (points) => {
  const current = badgeLevels.find((b) => points >= b.min && points <= b.max) || badgeLevels[0];
  const next = badgeLevels.find((b) => b.min > current.min) || null;
  const rangeMax = Number.isFinite(current.max) ? current.max : points;
  const denom = Math.max(1, rangeMax - current.min + 1);
  const progress = Number.isFinite(current.max) ? ((points - current.min) / denom) * 100 : 100;
  return { current, next, progress: Math.max(0, Math.min(100, progress)) };
};

const getInitials = (name) =>
  (name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const res = await axios.get('/enrollments/me');
      const enrollments = res.data?.data?.enrollments || res.data?.data || [];
      if (!Array.isArray(enrollments)) return [];
      return enrollments.map((e) => {
        const course = e.course || {};
        const completion = Number(e.completionPct ?? e.completion_pct ?? 0);
        const title = course.title || e.title || 'Untitled Course';
        const description =
          course.description ||
          course.shortDesc ||
          e.shortDesc ||
          e.short_desc ||
          '';
        const tags = course.tags || e.tags || [];
        const coverImage = course.coverImageUrl || e.coverImageUrl || e.cover_image_url || null;

        return {
          id: course.id || e.courseId || e.course_id,
          title,
          description,
          tags,
          coverImage,
          published: course.isPublished,
          status: e.status,
          progress: completion,
          completionPercent: completion,
          isEnrolled: true,
          enrolled: true,
        };
      });
    },
  });

  const points = Number(user?.totalPoints || user?.points || 0);
  const badge = getBadge(points);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) => (course.title || '').toLowerCase().includes(q));
  }, [courses, search]);

  const stats = useMemo(() => {
    const enrolled = courses.length;
    const completed = courses.filter((c) => Number(c.progress || 0) >= 100).length;
    const inProgress = courses.filter((c) => {
      const p = Number(c.progress || 0);
      return p > 0 && p < 100;
    }).length;
    return { enrolled, completed, inProgress };
  }, [courses]);

  return (
    <div className="flex gap-6">
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-20">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#2D31D4] text-white text-xl font-bold flex items-center justify-center">
              {getInitials(user?.name)}
            </div>
            <p className="mt-3 text-base font-bold text-gray-900">{user?.name || 'Learner'}</p>
            <p className="text-sm text-gray-500">{user?.email || 'learner@example.com'}</p>
          </div>

          <div className="mt-4 rounded-lg p-4 bg-gradient-to-br from-[#EEF0FF] to-white border border-[#E0E4FF]">
            <div className="text-4xl">{badge.current.emoji}</div>
            <p className={`mt-1 text-xl font-bold ${badge.current.color}`}>{badge.current.name}</p>
            <p className="text-xs text-gray-600">{points} points</p>
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#2D31D4] transition-all duration-500" style={{ width: `${badge.progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {badge.next ? `${Math.max(0, badge.next.min - points)} pts to ${badge.next.name}` : 'Top level reached'}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4 space-y-2">
            <p className="text-sm text-gray-700">📚 {stats.enrolled} Enrolled</p>
            <p className="text-sm text-gray-700">✓ {stats.completed} Completed</p>
            <p className="text-sm text-gray-700">▶ {stats.inProgress} In Progress</p>
          </div>
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold font-plus-jakarta-sans text-gray-900">My Courses</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-52 bg-gray-200 rounded" />
                  <div className="h-1.5 w-full bg-gray-200 rounded mt-3" />
                  <div className="h-10 w-full bg-gray-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-16 px-6 text-center">
            <div className="text-6xl mb-3">📚</div>
            <p className="text-gray-700 font-medium">No courses yet. Browse the catalog →</p>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="mt-4 px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium hover:bg-blue-800"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
