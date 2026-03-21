import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, MoreHorizontal, Clock3, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { getApiErrorMessage } from '../../lib/apiError';
import LessonEditorModal from './LessonEditorModal';

const typeStyles = {
  video: 'bg-blue-100 text-blue-700',
  document: 'bg-green-100 text-green-700',
  image: 'bg-purple-100 text-purple-700',
  quiz: 'bg-amber-100 text-amber-700',
};

const typeLabel = {
  video: 'Video',
  document: 'Doc',
  image: 'Image',
  quiz: 'Quiz',
};

const LessonsTab = ({ courseId }) => {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [lessonsState, setLessonsState] = useState([]);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      const res = await axios.get(`/courses/${courseId}/lessons`);
      const data = res.data?.data?.lessons || res.data?.lessons || res.data;
      const parsed = Array.isArray(data) ? data : [];
      setLessonsState(parsed);
      return parsed;
    },
  });

  React.useEffect(() => {
    setLessonsState(lessons);
  }, [lessons]);

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId) =>
      axios.delete(`/lessons/${lessonId}`, {
        headers: { 'X-Confirm-Delete': 'true' },
      }),
    onSuccess: (_, lessonId) => {
      setLessonsState((prev) => prev.filter((l) => l.id !== lessonId));
      setConfirmDeleteFor(null);
      toast.success('Deleted successfully');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete lesson')),
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered) => {
      const lessonIds = ordered.map((item) => item.id);
      return axios.patch(`/courses/${courseId}/lessons/reorder`, { lessonIds });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to reorder lessons'));
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
    },
  });

  const openCreate = () => {
    setEditingLesson(null);
    setEditorOpen(true);
  };

  const openEdit = (lesson) => {
    setEditingLesson(lesson);
    setEditorOpen(true);
    setMenuOpenFor(null);
  };

  const moveItem = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return lessonsState;
    const next = [...lessonsState];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    setLessonsState(next);
    return next;
  };

  const handleDragStart = (id) => setDraggedId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDropOn = (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = lessonsState.findIndex((l) => l.id === draggedId);
    const toIdx = lessonsState.findIndex((l) => l.id === targetId);
    moveItem(fromIdx, toIdx);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    reorderMutation.mutate(lessonsState);
  };

  const visibleLessons = lessonsState;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold text-gray-900">Course Content</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          {visibleLessons.length}
        </span>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : visibleLessons.length === 0 ? (
          <p className="text-sm text-gray-500">No lessons yet. Add your first lesson.</p>
        ) : (
          <div>
            {visibleLessons.map((lesson) => {
              const lessonType = lesson.type || lesson.lessonType;
              const duration = lesson.durationMinutes ?? lesson.durationMins ?? 0;

              return (
                <div key={lesson.id}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(lesson.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOn(lesson.id)}
                    onDragEnd={handleDragEnd}
                    className="bg-white border border-gray-200 rounded-lg p-3 mb-2 flex items-center gap-2 relative"
                  >
                    <span className="text-gray-400 cursor-grab select-none" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </span>

                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeStyles[lessonType] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabel[lessonType] || lessonType || 'Lesson'}
                    </span>

                    <p className="font-medium text-sm text-gray-900 flex-1 mx-3">{lesson.title || 'Untitled lesson'}</p>

                    {lessonType === 'video' ? (
                      <span className="text-sm text-gray-500 inline-flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5" />
                        {duration || 0} min
                      </span>
                    ) : null}

                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                      onClick={() => setMenuOpenFor((prev) => (prev === lesson.id ? null : lesson.id))}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpenFor === lesson.id ? (
                      <div className="absolute right-3 top-11 z-10 bg-white border border-gray-200 rounded-lg shadow-sm min-w-28">
                        <button
                          type="button"
                          onClick={() => openEdit(lesson)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteFor(lesson.id);
                            setMenuOpenFor(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {confirmDeleteFor === lesson.id ? (
                    <div className="mb-2 mt-1 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm flex items-center justify-between">
                      <span>Are you sure?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFor(null)}
                          className="px-2 py-1 rounded text-gray-700 hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLessonMutation.mutate(lesson.id)}
                          className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1"
                        >
                          {deleteLessonMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={openCreate}
          className="w-full mt-3 border border-dashed border-[#2D31D4] text-[#2D31D4] rounded-lg py-3 text-sm font-medium hover:bg-[#EEF0FF]"
        >
          + Add Content
        </button>
      </div>

      <LessonEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        courseId={courseId}
        lesson={editingLesson}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] })}
      />
    </div>
  );
};

export default LessonsTab;
