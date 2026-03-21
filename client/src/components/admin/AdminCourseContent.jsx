import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import LessonFormModal from './LessonFormModal';
import { deleteLesson } from '../../services/adminService';

// Fallback Icons
const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const QuizIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4 text-red-500 hover:text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4 text-gray-500 hover:text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const LessonIcon = ({ type }) => {
  if (type === 'video') return <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><VideoIcon /></div>;
  if (type === 'quiz') return <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><QuizIcon /></div>;
  return <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><DocumentIcon /></div>;
};

export default function AdminCourseContent({ courseId, lessons = [] }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  const deleteMut = useMutation({
    mutationFn: (id) => deleteLesson(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-course', courseId]),
    onError: (err) => alert(`Failed to delete lesson: ${err.message}`)
  });

  const openNew = () => {
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  const openEdit = (l) => {
    setEditingLesson(l);
    setIsModalOpen(true);
  };

  const removeLesson = (id) => {
    if (window.confirm("Are you sure you want to delete this lesson?")) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="max-w-4xl py-4 animate-fade-in space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Fraunces', serif" }}>Course Content</h3>
          <p className="text-sm text-gray-500 mt-1">Manage the lessons, videos, and quizzes inside your course.</p>
        </div>
        <button 
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-all shadow-md focus:outline-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Lesson
        </button>
      </div>

      <div className="space-y-3">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <VideoIcon />
            <span className="text-sm font-medium mt-3 text-gray-500">No lessons currently in this course.</span>
            <button onClick={openNew} className="text-brand font-bold text-sm mt-2 hover:underline">Add the first lesson</button>
          </div>
        ) : (
          lessons.map((lesson, idx) => (
            <div key={lesson.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
              
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 flex-shrink-0">
                  {idx + 1}
                </div>
                <LessonIcon type={lesson.lesson_type} />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 leading-tight block hover:text-brand cursor-pointer" onClick={() => openEdit(lesson)}>
                    {lesson.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 max-w-[400px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-1.5 py-0.5 bg-brand-light/50 rounded-sm">
                      {lesson.lesson_type}
                    </span>
                    {lesson.lesson_type === 'video' && lesson.duration_mins && (
                      <span className="text-xs font-medium text-gray-400">• {lesson.duration_mins} mins</span>
                    )}
                    {lesson.description && (
                      <span className="text-xs text-gray-500 truncate inline-block ml-1">
                        - {lesson.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEdit(lesson)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-brand/30 transition-colors"
                  title="Edit Lesson"
                >
                  <EditIcon />
                </button>
                <button 
                  onClick={() => removeLesson(lesson.id)}
                  disabled={deleteMut.isPending}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                  title="Delete Lesson"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <LessonFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseId={courseId}
        lessonToEdit={editingLesson}
      />
    </div>
  );
}
