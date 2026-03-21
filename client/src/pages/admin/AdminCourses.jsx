import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, createCourse, deleteCourse, getShareLink } from '../../services/adminService';

// ── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const KanbanIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DotsIcon = () => (
  <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);


// ── Create Modal ─────────────────────────────────────────────────────────────
function CreateCourseModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const { course } = await createCourse(title);
      onSuccess(course.id);
    } catch (err) {
      console.error(err);
      alert('Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
            Create New Course
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Course Name
          </label>
          <input
            type="text"
            required
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none"
            placeholder="e.g. Advanced React Patterns"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors disabled:opacity-50"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Course Card / Row helpers ────────────────────────────────────────────────
function getImageUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}`;
}

function handleCopyLink(id) {
  getShareLink(id).then(res => {
    navigator.clipboard.writeText(res.url);
    // Simple native alert fallback for shadcn toast
    alert('Link copied to clipboard!');
  }).catch(() => alert('Failed to get share link'));
}


// ── Main Page Component ──────────────────────────────────────────────────────
export default function AdminCourses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-courses', debouncedSearch],
    queryFn: () => getCourses(debouncedSearch),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => queryClient.invalidateQueries(['admin-courses']),
  });

  const handleDelete = (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const courses = data?.courses || [];
  const drafts = courses.filter(c => !c.is_published);
  const published = courses.filter(c => c.is_published);

  // ── Render Board Column ────────────────────────────────────────────────
  const renderColumn = (title, items) => (
    <div className="flex flex-col bg-gray-50/50 rounded-xl p-4 border border-gray-100 min-h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="bg-white text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">
          {items.length}
        </span>
      </div>
      
      <div className="flex flex-col gap-3">
        {items.map(course => (
          <div key={course.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
            {/* Image */}
            <div className="w-full h-32 rounded-md bg-gradient-to-br from-brand/80 to-[#0f172a] mb-3 overflow-hidden flex-shrink-0 relative">
              {course.cover_image_url && (
                <img src={getImageUrl(course.cover_image_url)} alt={course.title} className="w-full h-full object-cover" />
              )}
              {/* Badge Overlay */}
              <div className="absolute top-2 left-2">
                 <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-sm shadow-sm ${course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {course.is_published ? 'Published' : 'Draft'}
                 </span>
              </div>
            </div>

            {/* Content */}
            <h4 className="font-semibold text-gray-900 leading-tight mb-1 line-clamp-2" title={course.title}>
              {course.title}
            </h4>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {(course.tags || []).slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand/10 text-brand truncate max-w-[80px]">
                  {tag}
                </span>
              ))}
              {(course.tags?.length > 3) && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  +{course.tags.length - 3}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 text-xs text-gray-500 font-medium">
               <div className="flex flex-col">
                 <span>{course.lessons_count} lessons</span>
                 <span>{course.total_duration_mins} mins</span>
               </div>
               
               {/* Actions */}
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => navigate(`/admin/courses/${course.id}`)} className="p-1.5 rounded text-gray-500 hover:text-brand hover:bg-brand/10" title="Edit Course">
                   <EditIcon />
                 </button>
                 {course.is_published && (
                   <button onClick={() => handleCopyLink(course.id)} className="p-1.5 rounded text-gray-500 hover:text-brand hover:bg-brand/10" title="Copy Share Link">
                     <LinkIcon />
                   </button>
                 )}
                 <div className="relative group/menu">
                   <button className="p-1 rounded hover:bg-gray-100">
                     <DotsIcon />
                   </button>
                   <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden z-10 w-28">
                     <button onClick={() => handleDelete(course.id, course.title)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                       <TrashIcon /> Delete
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <span className="text-sm">No courses</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-10">
      
      {/* ── Header Row ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
            Courses
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your course catalog
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Kanban View"
            >
              <KanbanIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="List View"
            >
              <ListIcon />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
          >
            <PlusIcon />
            New Course
          </button>
        </div>
      </div>

      {/* ── Error / Loading States ─────────────────────────────── */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
          Failed to load courses. Please try again.
        </div>
      )}

      {isLoading && !isError && (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Content Views ────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <>
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {renderColumn('Draft', drafts)}
              {renderColumn('Published', published)}
              {/* Optional extensions: In Review, Archived, etc. */}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Tags</th>
                      <th className="px-6 py-4 text-center">Lessons</th>
                      <th className="px-6 py-4 text-center">Duration</th>
                      <th className="px-6 py-4 text-center">Views</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          No courses found.
                        </td>
                      </tr>
                    ) : (
                      courses.map(course => (
                        <tr key={course.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            <button onClick={() => navigate(`/admin/courses/${course.id}`)} className="hover:text-brand hover:underline text-left line-clamp-2">
                              {course.title}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-sm ${course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                               {course.is_published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(course.tags || []).slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand/10 text-brand truncate max-w-[80px]">
                                  {tag}
                                </span>
                              ))}
                              {(course.tags?.length > 2) && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                  +{course.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {course.lessons_count}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {course.total_duration_mins}m
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {course.views_count}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => navigate(`/admin/courses/${course.id}`)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded transition-colors" title="Edit">
                                 <EditIcon />
                               </button>
                               {course.is_published && (
                                 <button onClick={() => handleCopyLink(course.id)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand/10 rounded transition-colors" title="Copy Link">
                                   <LinkIcon />
                                 </button>
                               )}
                               <button onClick={() => handleDelete(course.id, course.title)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                 <TrashIcon />
                               </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newId) => navigate(`/admin/courses/${newId}`)}
      />

    </div>
  );
}
