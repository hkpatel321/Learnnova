import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, BookOpen } from 'lucide-react';
import axios from '../../lib/axios';
import CourseCard from '../../components/course/CourseCard';
import useAuthStore from '../../store/authStore';

export default function CourseCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('all');
  const { isAuthenticated } = useAuthStore();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['catalog', searchQuery],
    queryFn: async () => {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await axios.get('/courses/catalog', { params });
      return res.data?.data?.courses || [];
    },
  });

  const normalizedCourses = useMemo(
    () =>
      courses.map((course) => ({
        ...course,
        coverImage: course.coverImageUrl,
        published: course.isPublished,
        accessRule: course.accessRule || 'open',
      })),
    [courses]
  );

  const courseBuckets = useMemo(
    () => ({
      all: normalizedCourses,
      open: normalizedCourses.filter((course) => course.accessRule === 'open'),
      payment: normalizedCourses.filter((course) => course.accessRule === 'payment'),
      invitation: normalizedCourses.filter((course) => course.accessRule === 'invitation'),
    }),
    [normalizedCourses]
  );

  const activeCourses = courseBuckets[boardFilter] || courseBuckets.all;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-plus-jakarta-sans text-gray-900">
          Explore Courses
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          Find the perfect course to level up your skills
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  <div className="h-5 w-12 bg-gray-200 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : normalizedCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
          <div className="w-24 h-24 bg-[#EEF0FF] rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-[#2D31D4] opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-plus-jakarta-sans">
            {searchQuery ? 'No courses found' : 'No courses available yet'}
          </h2>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Check back soon — new courses are added regularly!'}
          </p>
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
              <p className="mt-1 text-sm text-gray-500">Everything currently available to explore</p>
            </button>

            <button
              type="button"
              onClick={() => setBoardFilter('open')}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                boardFilter === 'open'
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm shadow-emerald-200/60'
                  : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Free Access</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.open.length}</p>
              <p className="mt-1 text-sm text-gray-500">Open courses learners can join directly</p>
            </button>

            <button
              type="button"
              onClick={() => setBoardFilter('payment')}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                boardFilter === 'payment'
                  ? 'border-amber-300 bg-amber-50 shadow-sm shadow-amber-200/60'
                  : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/60'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Paid Access</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.payment.length}</p>
              <p className="mt-1 text-sm text-gray-500">Courses unlocked after successful payment</p>
            </button>

            <button
              type="button"
              onClick={() => setBoardFilter('invitation')}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                boardFilter === 'invitation'
                  ? 'border-sky-300 bg-sky-50 shadow-sm shadow-sky-200/60'
                  : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Invitation Only</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">{courseBuckets.invitation.length}</p>
              <p className="mt-1 text-sm text-gray-500">Private courses shared through invites</p>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {boardFilter === 'all'
                    ? 'All Courses'
                    : boardFilter === 'open'
                      ? 'Free Access Courses'
                      : boardFilter === 'payment'
                        ? 'Paid Access Courses'
                        : 'Invitation Only Courses'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {boardFilter === 'all'
                    ? 'Browse every published course from one organized catalog board.'
                    : boardFilter === 'open'
                      ? 'Start quickly with courses that do not need payment or invitation.'
                      : boardFilter === 'payment'
                        ? 'Premium courses that unlock after checkout.'
                        : 'Private courses that require an accepted invitation.'}
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
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {activeCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
