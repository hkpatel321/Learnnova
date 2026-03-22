import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import CourseCard from '../../components/course/CourseCard';
import { getBadgeMeta } from '../../lib/badges';

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
  const [boardFilter, setBoardFilter] = useState('all');

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const res = await axios.get('/enrollments/me');
      const enrollments = res.data?.data?.enrollments || res.data?.data || [];
      if (!Array.isArray(enrollments)) return [];
      return enrollments.map((e) => {
        const course = e.course || {};
        return {
          id: course.id || e.courseId,
          title: course.title || e.title || 'Untitled Course',
          description: course.description || course.shortDesc || e.shortDesc || '',
          tags: course.tags || e.tags || [],
          coverImage: course.coverImageUrl || e.coverImageUrl || null,
          published: course.isPublished ?? true,
          status: e.status,
          progress: e.completionPct || e.completion_pct || 0,
          completionPercent: e.completionPct || e.completion_pct || 0,
          isPaid: e.isPaid,
          amountPaid: e.amountPaid,
          paidAt: e.paidAt,
          isEnrolled: true,
          enrolled: true,
        };
      });
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const res = await axios.get('/payments/me');
      return res.data?.data?.payments || [];
    },
  });

  const points = Number(user?.totalPoints || user?.points || 0);
  const badge = getBadgeMeta(points);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) => (course.title || '').toLowerCase().includes(q));
  }, [courses, search]);

  const courseBuckets = useMemo(() => {
    const isCompleted = (course) => {
      const progress = Number(course.progress || course.completionPercent || 0);
      return (course.status || '').toLowerCase() === 'completed' || progress >= 100;
    };

    const isInProgress = (course) => {
      const progress = Number(course.progress || course.completionPercent || 0);
      const status = (course.status || '').toLowerCase();
      return status === 'in_progress' || (progress > 0 && progress < 100);
    };

    const isYetToStart = (course) => !isCompleted(course) && !isInProgress(course);

    return {
      all: filteredCourses,
      not_started: filteredCourses.filter(isYetToStart),
      in_progress: filteredCourses.filter(isInProgress),
      completed: filteredCourses.filter(isCompleted),
    };
  }, [filteredCourses]);

  const activeCourses = courseBuckets[boardFilter] || courseBuckets.all;

  const stats = useMemo(() => {
    const enrolled = courses.length;
    const completed = courses.filter((c) => (c.status || '').toLowerCase() === 'completed' || Number(c.progress || 0) >= 100).length;
    const inProgress = courses.filter((c) => {
      const p = Number(c.progress || 0);
      const s = (c.status || '').toLowerCase();
      return s === 'in_progress' || (p > 0 && p < 100);
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

          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-900">Recent Payments</p>
            {payments.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">Your Stripe test payments will appear here.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-800">{payment.course?.title || 'Course payment'}</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Received Stripe test payment of Rs. {Number(payment.amount || 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700/80">
                      Ref: {payment.providerPaymentId || payment.providerOrderId}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setBoardFilter('all')}
                className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                  boardFilter === 'all'
                    ? 'border-[#2D31D4] bg-[#EEF0FF] shadow-sm shadow-[#2D31D4]/10'
                    : 'border-gray-200 bg-white hover:border-[#C8CCFF] hover:bg-[#F7F8FF]'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2D31D4]">All Courses</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.all.length}</p>
                <p className="mt-1 text-sm text-gray-500">Every enrolled course in one board</p>
              </button>

              <button
                type="button"
                onClick={() => setBoardFilter('not_started')}
                className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                  boardFilter === 'not_started'
                    ? 'border-amber-300 bg-amber-50 shadow-sm shadow-amber-200/60'
                    : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/60'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Yet to Start</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.not_started.length}</p>
                <p className="mt-1 text-sm text-gray-500">Courses waiting for the first lesson</p>
              </button>

              <button
                type="button"
                onClick={() => setBoardFilter('in_progress')}
                className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                  boardFilter === 'in_progress'
                    ? 'border-sky-300 bg-sky-50 shadow-sm shadow-sky-200/60'
                    : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">In Progress</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.in_progress.length}</p>
                <p className="mt-1 text-sm text-gray-500">Courses actively being learned</p>
              </button>

              <button
                type="button"
                onClick={() => setBoardFilter('completed')}
                className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                  boardFilter === 'completed'
                    ? 'border-emerald-300 bg-emerald-50 shadow-sm shadow-emerald-200/60'
                    : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Completed</p>
                <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.completed.length}</p>
                <p className="mt-1 text-sm text-gray-500">Courses already finished</p>
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {boardFilter === 'all'
                      ? 'All Enrolled Courses'
                      : boardFilter === 'not_started'
                        ? 'Yet to Start'
                        : boardFilter === 'in_progress'
                          ? 'In Progress'
                          : 'Completed'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {boardFilter === 'all'
                      ? 'A single learner board for every course you have access to.'
                      : boardFilter === 'not_started'
                        ? 'Start any of these courses to move them into progress.'
                        : boardFilter === 'in_progress'
                          ? 'Pick up from where you left off and continue learning.'
                          : 'Your finished courses stay here for quick revisits.'}
                  </p>
                </div>
                <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                  {activeCourses.length} course{activeCourses.length === 1 ? '' : 's'}
                </div>
              </div>

              {activeCourses.length === 0 ? (
                <div className="mt-5 rounded-xl border-2 border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
                  No courses in this section right now.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {activeCourses.map((course) => (
                    <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
