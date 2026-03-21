import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Plus, Edit, Share2, Eye, BookOpen, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { resolveMediaUrl } from '../../lib/media';
import Modal from '../../components/ui/Modal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses', searchQuery],
    queryFn: async () => {
      const response = await axios.get('/courses', {
        params: searchQuery.trim() ? { search: searchQuery.trim() } : undefined,
      });
      const data = response.data?.data?.courses || response.data?.courses || response.data;
      if (!Array.isArray(data)) return [];
      return data.map(normalizeCourse);
    },
  });

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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => (course.title || '').toLowerCase().includes(query));
  }, [courses, searchQuery]);

  const draftCourses = filteredCourses.filter((course) => !course.published);
  const publishedCourses = filteredCourses.filter((course) => course.published);

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) {
      toast.error('Course title is required');
      return;
    }
    createCourseMutation.mutate(newCourseTitle.trim());
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center">
                Drafts
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {draftCourses.length}
                </span>
              </h3>
            </div>

            {draftCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}

            {draftCourses.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No draft courses
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center">
                Published
                <span className="ml-2 bg-[#EEF0FF] text-[#2D31D4] py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {publishedCourses.length}
                </span>
              </h3>
            </div>

            {publishedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}

            {publishedCourses.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No published courses
              </div>
            )}
          </div>
        </div>
      ) : (
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
