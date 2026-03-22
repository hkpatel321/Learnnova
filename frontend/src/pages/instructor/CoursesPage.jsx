import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Plus, Edit, Share2, Eye, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { resolveMediaUrl } from '../../lib/media';
import Modal from '../../components/ui/Modal';

const EMPTY_COURSES = [];

const LoadingSkeletons = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
    <div className="w-full h-32 bg-gray-200 rounded-lg mb-4" />
    <div className="w-20 h-4 bg-gray-200 rounded-full ml-auto mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
    <div className="flex gap-2 mb-4">
      <div className="w-12 h-4 bg-gray-200 rounded-full" />
      <div className="w-16 h-4 bg-gray-200 rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
    </div>
    <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
  </div>
);

const formatDuration = (totalMinutes = 0) => {
  const safeMinutes = Number.isFinite(Number(totalMinutes)) ? Number(totalMinutes) : 0;
  if (safeMinutes <= 0) return '0 min';

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const normalizeCourse = (course) => ({
  ...course,
  published: Boolean(course.isPublished ?? course.published),
  coverImage: course.coverImageUrl || course.coverImage || null,
  viewsCount: course.viewsCount ?? course.viewCount ?? course.views ?? 0,
  lessonCount: course.lessonCount ?? course.lessons?.length ?? 0,
  totalDurationMins: course.totalDurationMins ?? course.durationMinutes ?? 0,
});

const CoursesPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [boardFilter, setBoardFilter] = useState('published');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courseResponse, isLoading } = useQuery({
    queryKey: ['instructor-courses', searchQuery, page, pageSize],
    queryFn: async () => {
      const response = await axios.get('/courses', {
        params: {
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
          page,
          pageSize,
        },
      });
      const payload = response.data?.data || response.data;
      const data = payload?.courses || response.data?.courses || response.data;
      return {
        courses: Array.isArray(data) ? data.map(normalizeCourse) : [],
        pagination: payload?.pagination || null,
      };
    },
  });

  const courses = courseResponse?.courses || EMPTY_COURSES;
  const pagination = courseResponse?.pagination || {
    page,
    pageSize,
    totalCount: courses.length,
    totalPages: 1,
    hasPreviousPage: page > 1,
    hasNextPage: false,
  };

  const createCourseMutation = useMutation({
    mutationFn: async (title) => {
      const response = await axios.post('/courses', { title });
      return response.data?.data?.course || response.data?.course || response.data;
    },
    onSuccess: (data) => {
      toast.success('Course created successfully');
      setIsModalOpen(false);
      setNewCourseTitle('');
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      navigate(`/backoffice/courses/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create course');
    },
  });

  const filteredCourses = useMemo(() => {
    return courses;
  }, [courses]);

  const draftCourses = filteredCourses.filter((course) => !course.published);
  const publishedCourses = filteredCourses.filter((course) => course.published);
  const allCourses = filteredCourses;
  const boardCourses = boardFilter === 'draft' ? draftCourses : publishedCourses;
  const boardTitle = boardFilter === 'draft' ? 'Draft Courses' : 'Published Courses';
  const boardDescription =
    boardFilter === 'draft'
      ? 'Review works in progress, incomplete outlines, and courses still waiting to go live.'
      : 'Track the courses that are already live and ready for learners.';

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) {
      toast.error('Course title is required');
      return;
    }
    createCourseMutation.mutate(newCourseTitle.trim());
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  const copyToClipboard = async (course) => {
    const sharePath = course.websiteUrl ? `/courses/${course.websiteUrl}` : `/courses/${course.id}`;
    const url = `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Course link copied to clipboard');
    } catch {
      toast.error('Could not copy the course link');
    }
  };

  const CourseCard = ({ course }) => {
    const coverSrc = resolveMediaUrl(course.coverImage);

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 relative group hover:border-[#2D31D4] transition-colors">
        {coverSrc ? (
          <img src={coverSrc} alt={course.title} className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <div className="w-full h-32 rounded-lg bg-gradient-to-br from-[#2D31D4] to-[#1a1dd6] flex items-center justify-center">
            <span className="text-4xl font-bold text-white opacity-50">
              {course.title?.charAt(0).toUpperCase() || 'C'}
            </span>
          </div>
        )}

        <div className="absolute top-6 right-6">
          {course.published ? (
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Published
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
              Draft
            </span>
          )}
        </div>

        <h3 className="font-semibold text-[15px] text-gray-900 mt-3 line-clamp-2 min-h-[44px]">
          {course.title}
        </h3>

        <div className="flex flex-wrap gap-2 mt-2">
          {course.tags?.length > 0 ? (
            course.tags.map((tag, i) => (
              <span key={i} className="px-2.5 py-0.5 bg-[#EEF0FF] text-[#2D31D4] text-xs font-medium rounded-full">
                {tag}
              </span>
            ))
          ) : (
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
              No tags
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>Views</span>
            </div>
            <p className="mt-1 font-semibold text-gray-900">{course.viewsCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lessons</span>
            </div>
            <p className="mt-1 font-semibold text-gray-900">{course.lessonCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Duration</span>
            </div>
            <p className="mt-1 font-semibold text-gray-900">{formatDuration(course.totalDurationMins)}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/backoffice/courses/${course.id}`)}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Course
          </button>
          <button
            onClick={() => copyToClipboard(course)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#2D31D4] border border-[#D6D8FF] rounded-lg hover:bg-[#EEF0FF] transition-colors"
            title="Share Course"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-[22px] font-bold font-plus-jakarta-sans text-gray-900">My Courses</h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search courses by name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full sm:w-72 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
            />
          </div>

          <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#2D31D4]' : 'text-gray-500 hover:text-gray-700'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#2D31D4]' : 'text-gray-500 hover:text-gray-700'}`}
              title="Kanban view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-[#2D31D4] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Course
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeletons />
          <LoadingSkeletons />
          <LoadingSkeletons />
        </div>
      ) : courses.length === 0 && !searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
          <div className="w-32 h-32 bg-[#EEF0FF] rounded-full flex items-center justify-center mb-6 text-[#2D31D4]">
            <BookOpen className="w-16 h-16 opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-plus-jakarta-sans">No courses yet</h2>
          <p className="text-gray-500 mb-6 max-w-md">You haven't created any courses. Start sharing your knowledge by building your first course today.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-5 py-2.5 bg-[#2D31D4] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first course
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setBoardFilter('published')}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                boardFilter === 'published'
                  ? 'border-[#2D31D4] bg-[#EEF0FF] shadow-sm shadow-[#2D31D4]/10'
                  : 'border-gray-200 bg-white hover:border-[#C8CCFF] hover:bg-[#F7F8FF]'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2D31D4]">Published</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{publishedCourses.length}</p>
                  <p className="mt-1 text-sm text-gray-500">Live courses ready for learners</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2D31D4] shadow-sm">
                  {boardFilter === 'published' ? 'Active board' : 'Open board'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBoardFilter('draft')}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                boardFilter === 'draft'
                  ? 'border-[#2D31D4] bg-[#EEF0FF] shadow-sm shadow-[#2D31D4]/10'
                  : 'border-gray-200 bg-white hover:border-[#C8CCFF] hover:bg-[#F7F8FF]'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Draft</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{draftCourses.length}</p>
                  <p className="mt-1 text-sm text-gray-500">Courses still being prepared</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                  {boardFilter === 'draft' ? 'Active board' : 'Open board'}
                </span>
              </div>
            </button>

            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Visible Now</div>
              <p className="mt-3 text-3xl font-bold text-gray-900">{boardCourses.length}</p>
              <p className="mt-1 text-sm text-gray-500">Courses shown in the current kanban</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">All Courses</div>
              <p className="mt-3 text-3xl font-bold text-gray-900">{allCourses.length}</p>
              <p className="mt-1 text-sm text-gray-500">Across draft and published states</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{boardTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{boardDescription}</p>
              </div>
              <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                {boardCourses.length} course{boardCourses.length === 1 ? '' : 's'}
              </div>
            </div>

            {boardCourses.length === 0 ? (
              <div className="mt-5 rounded-xl border-2 border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
                {boardFilter === 'draft' ? 'No draft courses found.' : 'No published courses found.'}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {boardCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Showing page {pagination.page} of {pagination.totalPages} with {pagination.totalCount} total courses
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#2D31D4]"
                >
                  {[6, 8, 12, 16].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="min-w-[72px] text-center text-sm font-medium text-gray-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[980px]">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4 text-center">Views</th>
                  <th className="px-6 py-4 text-center">Lessons</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.map((course) => {
                  const coverSrc = resolveMediaUrl(course.coverImage);

                  return (
                    <tr key={course.id} className="hover:bg-[#F4F5FF] transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {coverSrc ? (
                            <img src={coverSrc} alt="" className="w-10 h-10 rounded shadow-sm object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#2D31D4] bg-opacity-10 text-[#2D31D4] flex items-center justify-center font-bold flex-shrink-0">
                              {course.title?.charAt(0).toUpperCase() || 'C'}
                            </div>
                          )}
                          <p className="font-medium text-gray-900 truncate">{course.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1 flex-wrap max-w-[220px]">
                          {course.tags?.length ? course.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-sm">
                              {tag}
                            </span>
                          )) : <span className="text-xs text-gray-400">No tags</span>}
                          {course.tags?.length > 3 && <span className="text-gray-400 text-xs">+{course.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center text-gray-600">{course.viewsCount}</td>
                      <td className="px-6 py-3 text-center text-gray-600">{course.lessonCount}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDuration(course.totalDurationMins)}</td>
                      <td className="px-6 py-3">
                        {course.published ? (
                          <span className="inline-flex items-center text-green-600 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50">
                            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500"></span>
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100">
                            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-gray-400"></span>
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-gray-400">
                          <button
                            onClick={() => navigate(`/backoffice/courses/${course.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => copyToClipboard(course)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#2D31D4] border border-[#D6D8FF] rounded-lg hover:bg-[#EEF0FF] transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No courses found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Showing page {pagination.page} of {pagination.totalPages} with {pagination.totalCount} total courses
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#2D31D4]"
                >
                  {[6, 8, 12, 16].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="min-w-[72px] text-center text-sm font-medium text-gray-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen} title="Create New Course">
        <form onSubmit={handleCreateCourse} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
              placeholder="e.g. Advanced React Patterns"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCourseMutation.isPending}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-70"
            >
              {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CoursesPage;
