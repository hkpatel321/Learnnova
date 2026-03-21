import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLesson, updateLesson } from '../../services/adminService';

// Fallback icon components
const CloseIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function LessonFormModal({ isOpen, onClose, courseId, lessonToEdit }) {
  const queryClient = useQueryClient();
  const isEditing = !!lessonToEdit;
  
  const [formData, setFormData] = useState({
    title: '',
    lesson_type: 'video',
    description: '',
    video_url: '',
    duration_mins: '',
    file_url: '',
    allow_download: false,
  });

  useEffect(() => {
    if (lessonToEdit) {
      setFormData({
        title: lessonToEdit.title || '',
        lesson_type: lessonToEdit.lesson_type || 'video',
        description: lessonToEdit.description || '',
        video_url: lessonToEdit.video_url || '',
        duration_mins: lessonToEdit.duration_mins || '',
        file_url: lessonToEdit.file_url || '',
        allow_download: lessonToEdit.allow_download || false,
      });
    } else {
      setFormData({
        title: '',
        lesson_type: 'video',
        description: '',
        video_url: '',
        duration_mins: '',
        file_url: '',
        allow_download: false,
      });
    }
  }, [lessonToEdit, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data) => isEditing 
      ? updateLesson(lessonToEdit.id, data) 
      : createLesson({ ...data, course_id: courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-course', courseId]);
      onClose();
    },
    onError: (err) => {
      alert(`Failed to save lesson: ${err.message}`);
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // Cleanup submission data
    const payload = { ...formData };
    
    // Nullify empty strings explicitly
    if (payload.description === '') payload.description = null;
    if (payload.video_url === '') payload.video_url = null;
    if (payload.file_url === '') payload.file_url = null;
    
    // Convert duration properly, null if empty
    if (payload.duration_mins === '') {
      payload.duration_mins = null;
    } else if (payload.duration_mins) {
      payload.duration_mins = Number(payload.duration_mins);
    }

    if (payload.lesson_type !== 'video') {
      payload.video_url = null;
      payload.duration_mins = null;
    }
    if (!['document', 'image'].includes(payload.lesson_type)) {
      payload.file_url = null;
      payload.allow_download = false;
    }

    saveMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col my-8 sm:my-auto relative shrink-0">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>
            {isEditing ? 'Edit Lesson' : 'Add New Lesson'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <CloseIcon />
          </button>
        </div>
        
        <form id="lesson-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Lesson Title <span className="text-red-500">*</span></label>
            <input 
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="e.g. Introduction to the course"
            />
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1.5">Lesson Type</label>
             <select
               value={formData.lesson_type}
               onChange={e => setFormData({ ...formData, lesson_type: e.target.value })}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand focus:border-brand"
             >
               <option value="video">Video</option>
               <option value="document">Document (PDF)</option>
               <option value="image">Image</option>
               <option value="quiz">Quiz</option>
             </select>
          </div>

          {formData.lesson_type === 'video' && (
            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Video URL</label>
                <input 
                  type="url"
                  value={formData.video_url}
                  onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Duration (minutes)</label>
                <input 
                  type="number"
                  min="1"
                  value={formData.duration_mins}
                  onChange={e => setFormData({ ...formData, duration_mins: e.target.value })}
                  className="w-full max-w-[120px] px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="15"
                />
              </div>
            </div>
          )}

          {['document', 'image'].includes(formData.lesson_type) && (
            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">File URL</label>
                <input 
                  type="url"
                  value={formData.file_url}
                  onChange={e => setFormData({ ...formData, file_url: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.allow_download}
                  onChange={e => setFormData({ ...formData, allow_download: e.target.checked })}
                  className="w-4 h-4 text-brand bg-white border-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700">Allow Learner to Download File</span>
              </label>
            </div>
          )}

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-1.5">Short Description</label>
             <textarea
               value={formData.description}
               onChange={e => setFormData({ ...formData, description: e.target.value })}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand min-h-[80px]"
               placeholder="Optional description of this module"
             />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
             <button
               type="button"
               onClick={onClose}
               disabled={saveMutation.isPending}
               className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 bg-white shadow-sm"
             >
               Cancel
             </button>
             <button
               type="submit"
               form="lesson-form"
               disabled={saveMutation.isPending || !formData.title.trim()}
               className="px-6 py-2 text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors shadow-sm disabled:opacity-50"
             >
               {saveMutation.isPending ? 'Saving...' : 'Save Lesson'}
             </button>
        </div>
      </div>
    </div>
  );
}
