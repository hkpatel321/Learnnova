import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Plus, Edit, Share2, MoreVertical, Eye, BookOpen, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { resolveMediaUrl } from '../../lib/media';

// Modal component inline since it wasn't requested for separate modification but expected to exist/work
import Modal from '../../components/ui/Modal';

const LoadingSkeletons = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
    <div className="w-full h-32 bg-gray-200 rounded-lg mb-4" />
    <div className="w-16 h-4 bg-gray-200 rounded-full ml-auto mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
    <div className="flex gap-2 mb-4">
      <div className="w-12 h-4 bg-gray-200 rounded-full" />
      <div className="w-12 h-4 bg-gray-200 rounded-full" />
    </div>
    <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
  </div>
);

const CoursesPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: async () => {
      const response = await axios.get('/courses');
      const data = response.data?.data?.courses || response.data?.courses || response.data;
      if (!Array.isArray(data)) return [];
      return data.map(c => ({
        ...c,
        published: c.isPublished,
        coverImage: c.coverImageUrl,
      }));
    }
  });

  // Create course mutation
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
      // Redirect to new course edit page
      navigate(`/backoffice/courses/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create course');
    }
  });

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) {
      toast.error('Course title is required');
      return;
    }
    createCourseMutation.mutate(newCourseTitle);
  };

  const copyToClipboard = (courseId) => {
    const url = `${window.location.origin}/courses/${courseId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const draftCourses = filteredCourses.filter(c => !c.published);
  const publishedCourses = filteredCourses.filter(c => c.published);

  // Common Card Component
  const CourseCard = ({ course }) => {
    const coverSrc = resolveMediaUrl(course.coverImageUrl || course.cover_image_url || course.coverImage);

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 relative group hover:border-[#2D31D4] transition-colors">
        {/* Cover */}
        {coverSrc ? (
          <img src={coverSrc} alt={course.title} className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <div className="w-full h-32 rounded-lg bg-gradient-to-br from-[#2D31D4] to-[#1a1dd6] flex items-center justify-center">
            <span className="text-4xl font-bold text-white opacity-50">
              {course.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Badge */}
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

        {/* Title */}
        <h3 className="font-semibold text-[15px] text-gray-900 mt-3 line-clamp-2 min-h-[44px]">
          {course.title}
        </h3>

        {/* Tags */}
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

        {/* Stats */}
        <div className="flex items-center text-xs text-gray-500 mt-4 gap-3">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {course.views || 0}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.lessons?.length || 0} lessons</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration || '0h'}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <button 
            onClick={() => navigate(`/backoffice/courses/${course.id}`)}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Course
          </button>
          <button 
            onClick={() => copyToClipboard(course.id)}
            className="p-1.5 text-gray-400 hover:text-[#2D31D4] hover:bg-[#EEF0FF] rounded-md transition-colors"
            title="Share Course"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-[22px] font-bold font-plus-jakarta-sans text-gray-900">
          My Courses
        </h1>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full md:w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#2D31D4]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#2D31D4]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* New Course Btn */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-[#2D31D4] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
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
        /* Empty State */
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
        /* Kanban / Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Draft Column */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center">
                Drafts
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {draftCourses.length}
                </span>
              </h3>
            </div>
            
            {draftCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
            
            {draftCourses.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No draft courses
              </div>
            )}
          </div>

          {/* Published Column */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 flex items-center">
                Published
                <span className="ml-2 bg-[#EEF0FF] text-[#2D31D4] py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {publishedCourses.length}
                </span>
              </h3>
            </div>

            {publishedCourses.map(course => (
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
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-center">Lessons</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCourses.map((course) => {
                const coverSrc = resolveMediaUrl(course.coverImageUrl || course.cover_image_url || course.coverImage);
                return (
                <tr key={course.id} className="hover:bg-[#F4F5FF] transition-colors group">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                       {coverSrc ? (
                        <img src={coverSrc} alt="" className="w-10 h-10 rounded shadow-sm object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#2D31D4] bg-opacity-10 text-[#2D31D4] flex items-center justify-center font-bold">
                          {course.title.charAt(0)}
                        </div>
                      )}
                      <p className="font-medium text-gray-900">{course.title}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                       {course.tags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-sm">
                          {tag}
                        </span>
                      ))}
                      {course.tags?.length > 2 && <span className="text-gray-400 text-xs">+{course.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-500">
                    {course.lessons?.length || 0}
                  </td>
                  <td className="px-6 py-3">
                    {course.published ? (
                      <span className="flex items-center text-green-600 text-xs font-medium"><span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500"></span> Published</span>
                    ) : (
                      <span className="flex items-center text-gray-500 text-xs font-medium"><span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-gray-400"></span> Draft</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400">
                      <button 
                        onClick={() => navigate(`/backoffice/courses/${course.id}`)}
                        className="p-1.5 hover:text-[#2D31D4] hover:bg-[#EEF0FF] rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => copyToClipboard(course.id)}
                        className="p-1.5 hover:text-[#2D31D4] hover:bg-[#EEF0FF] rounded transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No courses found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Course Modal */}
      <Modal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        title="Create New Course"
      >
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
              {createCourseMutation.isPending ? 'Creating...' : 'Create Course →'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CoursesPage;
