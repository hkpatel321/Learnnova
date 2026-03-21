import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LessonStatusIcon from '../components/LessonStatusIcon';
import QuizPlayer from '../components/QuizPlayer';
import api from '../lib/api';

// ── Sidebar item ─────────────────────────────────────────────────────────────
function SidebarItem({ item, isActive, progressMap, courseId, navigate }) {
  const isQuiz = item.item_type === 'quiz_standalone';
  const status = progressMap[item.id] ?? 'not_started';
  const displayStatus = isActive && status === 'not_started' ? 'in_progress' : status;

  return (
    <div className={`border-l-2 transition-all ${isActive ? 'border-[#1a24cc]' : 'border-transparent'}`}>
      <button
        onClick={() => {
          if (isQuiz) navigate(`/learn/${courseId}/quiz/${item.id}`);
          else navigate(`/learn/${courseId}/${item.id}`);
        }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors rounded-r-lg group
          ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
      >
        {isQuiz && <span className="text-brand text-xs font-bold px-1 py-0.5 bg-brand/10 rounded">QZ</span>}
        <span className={`flex-1 text-sm leading-snug truncate ${isActive ? 'text-white font-semibold' : 'text-gray-300'}`}>
          {item.title}
        </span>
        <span className="flex-shrink-0">
          <LessonStatusIcon status={displayStatus} />
        </span>
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CourseQuizPlayerPage() {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [syllabusItems, setSyllabusItems] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch course (sidebar)
  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${courseId}`)
      .then(r => {
        setCourse(r.data.course);
        const sortedLessons = [...(r.data.lessons ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(l => ({ ...l, item_type: 'lesson' }));
        const standaloneQuizzes = (r.data.quizzes ?? [])
          .filter(q => !q.lesson_id)
          .map(q => ({ ...q, item_type: 'quiz_standalone' }));
        
        setSyllabusItems([...sortedLessons, ...standaloneQuizzes]);

        if (r.data.enrollment?.id) {
          setEnrollmentId(r.data.enrollment.id);
        }

        const map = {};
        for (const lp of (r.data.lesson_progress ?? [])) {
          map[lp.lesson_id] = lp.is_completed ? 'completed' : 'in_progress';
        }
        // Let's assume passed quizzes are completed if we check quiz_attempts (not fully implemented in map, but that's okay for now)
        setProgressMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleQuizComplete = useCallback(() => {
    // When quiz completes, move to next item
    const currentIdx = syllabusItems.findIndex(i => i.id === quizId && i.item_type === 'quiz_standalone');
    const nextItem = syllabusItems[currentIdx + 1];
    if (nextItem) {
      if (nextItem.item_type === 'quiz_standalone') {
        navigate(`/learn/${courseId}/quiz/${nextItem.id}`);
      } else {
        navigate(`/learn/${courseId}/${nextItem.id}`);
      }
    } else {
      navigate(`/courses/${courseId}`);
    }
  }, [courseId, navigate, quizId, syllabusItems]);

  const handleNextContent = useCallback(() => {
    handleQuizComplete();
  }, [handleQuizComplete]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1a24cc] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* ── Sidebar ── */}
      <div className="w-[320px] shrink-0 bg-[#0a0a0a] flex flex-col shadow-xl z-10 border-r border-white/10 hidden md:flex">
        <div className="p-5 border-b border-white/10 shrink-0 bg-[#111]">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors mb-4 group"
          >
            ← Back
          </button>
          <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">
            {course?.title || 'Loading...'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto w-full pb-6 custom-scrollbar">
          <div className="p-4 space-y-1">
            {syllabusItems.map((item, idx) => (
              <SidebarItem
                key={`${item.item_type}-${item.id}`}
                item={item}
                isActive={item.id === quizId && item.item_type === 'quiz_standalone'}
                progressMap={progressMap}
                courseId={courseId}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <header className="h-[60px] shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10 md:hidden">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 font-medium text-sm">
            ← Back
          </button>
          <span className="font-bold text-gray-900 truncate mx-4">{course?.title}</span>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="m-4 md:m-8">
            {enrollmentId && (
              <QuizPlayer
                quizId={quizId}
                enrollmentId={enrollmentId}
                onQuizComplete={handleQuizComplete}
                onNextContent={handleNextContent}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
