import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LessonStatusIcon from '../components/LessonStatusIcon';
import QuizPlayer from '../components/QuizPlayer';
import api from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Extract YouTube video ID from watch?v=, youtu.be/, embed/ URLs */
function parseYouTubeId(url = '') {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /embed\/([^?&#]+)/,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Attachment link row ───────────────────────────────────────────────────────
function AttachmentRow({ att }) {
  const isFile = att.attachment_type === 'file';
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      download={isFile ? true : undefined}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#1a24cc]
                 transition-colors group pl-2 py-0.5"
    >
      {isFile ? (
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ) : (
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656
                   5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4
                   4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
      <span className="truncate">{att.label}</span>
    </a>
  );
}

// ── Sidebar lesson item ───────────────────────────────────────────────────────
function SidebarLesson({ lesson, isActive, progressMap, attachments, courseId, navigate }) {
  const status = progressMap[lesson.id] ?? 'not_started';
  // If active and not yet completed, treat visually as 'in_progress'
  const displayStatus = isActive && status === 'not_started' ? 'in_progress' : status;

  return (
    <div className={`border-l-2 transition-all
      ${isActive ? 'border-[#1a24cc]' : 'border-transparent'}`}
    >
      <button
        onClick={() => navigate(`/learn/${courseId}/${lesson.id}`)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left
                    transition-colors rounded-r-lg group
          ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
      >
        {/* Title */}
        <span className={`flex-1 text-sm leading-snug truncate
          ${isActive ? 'text-white font-semibold' : 'text-gray-300'}`}>
          {lesson.title}
        </span>
        {/* Status icon */}
        <span className="flex-shrink-0">
          <LessonStatusIcon status={displayStatus} />
        </span>
      </button>

      {/* Attachments (only under active or any with attachments) */}
      {attachments?.length > 0 && isActive && (
        <div className="pl-4 pb-1 space-y-0.5">
          {attachments.map(att => (
            <AttachmentRow key={att.id} att={att} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Left Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ open, onToggle, course, lessons, progressMap, attachments,
                   currentLessonId, enrollmentId, courseId, navigate }) {
  const total     = lessons.length;
  const completed = lessons.filter(l => progressMap[l.id] === 'completed').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      {/* Toggle tab (always visible on left edge) */}
      <button
        onClick={onToggle}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        className={`fixed top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
                    w-5 h-12 bg-[#1a24cc] text-white rounded-r-lg shadow-lg
                    transition-all duration-300
                    ${open ? 'left-[280px]' : 'left-0'}`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d={open ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full z-20 flex flex-col
                    bg-[#0f172a] transition-all duration-300 overflow-hidden
                    ${open ? 'w-[280px]' : 'w-0'}`}
      >
        <div className="flex flex-col h-full w-[280px]">
          {/* Back button */}
          <div className="px-4 pt-5 pb-3 flex-shrink-0">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-[#1a24cc] text-white text-xs font-semibold
                         hover:bg-[#1219a0] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Course
            </button>
          </div>

          {/* Course info */}
          <div className="px-4 pb-4 flex-shrink-0">
            <h2 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-2">
              {course?.title ?? 'Loading…'}
            </h2>
            <p className="text-[#1a24cc] text-xs font-semibold mb-1.5">
              {pct}% Completed
            </p>
            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1a24cc] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mx-4 border-t border-white/10 mb-2 flex-shrink-0" />

          {/* Lesson list */}
          <div className="flex-1 overflow-y-auto px-1 pb-6 space-y-0.5
                          scrollbar-thin scrollbar-thumb-white/10">
            {lessons.map(lesson => (
              <SidebarLesson
                key={lesson.id}
                lesson={lesson}
                isActive={lesson.id === currentLessonId}
                progressMap={progressMap}
                attachments={lesson.id === currentLessonId ? attachments : []}
                courseId={courseId}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Video viewer ──────────────────────────────────────────────────────────────
function VideoViewer({ url }) {
  const videoId = parseYouTubeId(url);
  if (!videoId) {
    return (
      <div className="bg-gray-100 rounded-xl flex items-center justify-center h-64 text-gray-400">
        <p>Invalid or unsupported video URL.</p>
      </div>
    );
  }
  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-lg"
         style={{ paddingTop: '56.25%' /* 16:9 */ }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="Lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}

// ── Document viewer ───────────────────────────────────────────────────────────
function DocumentViewer({ url, allowDownload }) {
  return (
    <div className="space-y-3">
      <iframe
        src={url}
        title="Document"
        className="w-full border border-gray-200 rounded-xl shadow-sm"
        style={{ height: 500 }}
      />
      {allowDownload && (
        <a
          href={url}
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-[#1a24cc] text-white text-sm font-semibold
                     hover:bg-[#1219a0] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Document
        </a>
      )}
    </div>
  );
}

// ── Image viewer ──────────────────────────────────────────────────────────────
function ImageViewer({ url, allowDownload, title }) {
  return (
    <div className="space-y-3 flex flex-col items-center">
      <img
        src={url}
        alt={title}
        className="max-w-full rounded-xl shadow-md border border-gray-200 object-contain"
        style={{ maxHeight: '70vh' }}
      />
      {allowDownload && (
        <a
          href={url}
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-[#1a24cc] text-white text-sm font-semibold
                     hover:bg-[#1219a0] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Image
        </a>
      )}
    </div>
  );
}

// ── Quiz placeholder (full QuizPlayer is a future component) ─────────────────
function OGquiz({ quizId, enrollmentId, onQuizComplete }) {
  return (
    <div className="bg-[#eef2ff] border border-[#1a24cc]/20 rounded-2xl p-8
                    flex flex-col items-center gap-3">
      <svg className="w-12 h-12 text-[#1a24cc]" fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                 a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
      </svg>
      <p className="font-semibold text-[#1a24cc]">Quiz</p>
      <p className="text-sm text-gray-500">Quiz ID: {quizId}</p>
      <QuizPlayer quizId={quizId} enrollmentId={enrollmentId} onQuizComplete={onQuizComplete} />
    </div>
  );
}

// ── Content viewer dispatcher ─────────────────────────────────────────────────
function LessonContent({ lesson, quiz, enrollmentId, onQuizComplete }) {
  switch (lesson.lesson_type) {
    case 'video':
      return <VideoViewer url={lesson.video_url} />;
    case 'document':
      return (
        <DocumentViewer
          url={lesson.file_url}
          allowDownload={lesson.allow_download}
        />
      );
    case 'image':
      return (
        <ImageViewer
          url={lesson.file_url}
          allowDownload={lesson.allow_download}
          title={lesson.title}
        />
      );
    case 'quiz':
      return quiz
        ? <OGquiz quizId={quiz.id} enrollmentId={enrollmentId} onQuizComplete={onQuizComplete} />
        : <p className="text-gray-400 text-sm">No quiz linked to this lesson.</p>;
    default:
      return (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
          Unsupported lesson type: {lesson.lesson_type}
        </div>
      );
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PlayerSkeleton({ sidebarOpen }) {
  return (
    <div className={`flex-1 min-w-0 p-6 animate-pulse transition-all duration-300
                     ${sidebarOpen ? 'ml-[280px]' : 'ml-5'}`}>
      <div className="h-6  w-3/4 bg-gray-200 rounded mb-4" />
      <div className="h-4  w-full bg-gray-100 rounded mb-2" />
      <div className="h-4  w-5/6 bg-gray-100 rounded mb-8" />
      <div className="w-full rounded-xl bg-gray-200" style={{ paddingTop: '56.25%' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: LessonPlayer
// ─────────────────────────────────────────────────────────────────────────────
export default function LessonPlayer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [lesson,         setLesson]         = useState(null);
  const [attachments,    setAttachments]    = useState([]);
  const [quiz,           setQuiz]           = useState(null);
  const [isCompleted,    setIsCompleted]    = useState(false);
  const [enrollmentId,   setEnrollmentId]   = useState(null);

  // Sidebar course data
  const [course,         setCourse]         = useState(null);
  const [allLessons,     setAllLessons]     = useState([]);
  const [progressMap,    setProgressMap]    = useState({});

  const [loadingLesson,  setLoadingLesson]  = useState(true);
  const [loadingCourse,  setLoadingCourse]  = useState(true);
  const [completing,     setCompleting]     = useState(false);
  const [error,          setError]          = useState(null);

  // Time tracking ref
  const timeIntervalRef = useRef(null);

  // ── Fetch lesson content ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingLesson(true);
    setError(null);
    api.get(`/lessons/${lessonId}/content`)
      .then(r => {
        setLesson(r.data.lesson);
        setAttachments(r.data.attachments ?? []);
        setQuiz(r.data.quiz ?? null);
        setIsCompleted(r.data.is_completed ?? false);
      })
      .catch(err => {
        const msg = err.response?.data?.error ?? 'Failed to load lesson.';
        setError(msg);
      })
      .finally(() => setLoadingLesson(false));
  }, [lessonId]);

  // ── Fetch course (sidebar) ────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCourse(true);
    api.get(`/courses/${courseId}`)
      .then(r => {
        setCourse(r.data.course);
        const sorted = [...(r.data.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        setAllLessons(sorted);
        // enrollment_id
        if (r.data.enrollment?.id) {
          setEnrollmentId(r.data.enrollment.id);
        }
        // Build progress map
        const map = {};
        for (const lp of (r.data.lesson_progress ?? [])) {
          map[lp.lesson_id] = lp.is_completed ? 'completed' : 'in_progress';
        }
        setProgressMap(map);
      })
      .catch(console.error)
      .finally(() => setLoadingCourse(false));
  }, [courseId]);

  // ── Time tracking: +1 min every 60s ──────────────────────────────────────
  useEffect(() => {
    if (!enrollmentId) return;
    timeIntervalRef.current = setInterval(() => {
      api.put(`/enrollments/${enrollmentId}/time`, { minutes_to_add: 1 })
         .catch(() => {}); // fire-and-forget, silent fail
    }, 60_000);
    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, [enrollmentId]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const currentIdx  = allLessons.findIndex(l => l.id === lessonId);
  const nextLesson  = allLessons[currentIdx + 1] ?? null;
  const isLast      = currentIdx === allLessons.length - 1 && allLessons.length > 0;

  // ── Mark complete + navigate ──────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!enrollmentId || completing) return;
    setCompleting(true);
    try {
      // Mark current lesson complete
      await api.post(`/lessons/${lessonId}/complete`, { enrollment_id: enrollmentId });
      // Update local state
      setIsCompleted(true);
      setProgressMap(prev => ({ ...prev, [lessonId]: 'completed' }));

      if (isLast) {
        // Finished course — go back to course detail
        navigate(`/courses/${courseId}`);
      } else if (nextLesson) {
        navigate(`/learn/${courseId}/${nextLesson.id}`);
      }
    } catch (err) {
      console.error('Failed to mark complete:', err);
    } finally {
      setCompleting(false);
    }
  }, [enrollmentId, lessonId, isLast, nextLesson, courseId, navigate, completing]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const loading = loadingLesson;  // lesson load gates the viewer

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
        course={course}
        lessons={allLessons}
        progressMap={progressMap}
        attachments={attachments}
        currentLessonId={lessonId}
        enrollmentId={enrollmentId}
        courseId={courseId}
        navigate={navigate}
      />

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main
        className={`flex flex-col flex-1 min-w-0 h-full overflow-y-auto
                    transition-all duration-300
                    ${sidebarOpen ? 'ml-[280px]' : 'ml-5'}`}
      >
        {loading ? (
          <PlayerSkeleton sidebarOpen={sidebarOpen} />
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="px-5 py-2 rounded-xl bg-[#1a24cc] text-white text-sm font-semibold"
            >
              ← Back to Course
            </button>
          </div>
        ) : (
          <>
            {/* ── Scrollable content area ─────────────────────────────── */}
            <div className="flex-1 px-6 sm:px-10 py-8 max-w-4xl w-full mx-auto">

              {/* Description box */}
              {lesson?.description && (
                <div className="mb-5 bg-[#eef2ff] border border-[#1a24cc]/20
                                rounded-xl px-5 py-3">
                  <p className="text-sm text-[#1a24cc]/80 italic leading-relaxed">
                    {lesson.description}
                  </p>
                </div>
              )}

              {/* Lesson title */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5
                             leading-tight">
                {lesson?.title}
              </h1>

              {/* Viewer */}
              {lesson && <LessonContent lesson={lesson} quiz={quiz}
                            enrollmentId={enrollmentId}
                            onQuizComplete={() => setProgressMap(prev => ({ ...prev, [lessonId]: 'completed' }))}
                          />}

              {/* Attachments section (below viewer) */}
              {attachments.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase
                                 tracking-widest mb-3">
                    Attachments
                  </h3>
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.attachment_type === 'file' ? true : undefined}
                        className="flex items-center gap-2 text-sm text-[#1a24cc]
                                   hover:underline"
                      >
                        {att.attachment_type === 'file' ? (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none"
                               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4
                                     4m0 0l-4-4m4 4V4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none"
                               viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0
                                     105.656 5.656l1.102-1.101m-.758-4.899a4 4 0
                                     005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                        {att.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Spacer for fixed bottom bar */}
              <div className="h-24" />
            </div>

            {/* ── FIXED BOTTOM BAR ────────────────────────────────────── */}
            <div className="fixed bottom-0 right-0 z-10 bg-white border-t
                            border-gray-200 shadow-lg flex items-center justify-between
                            px-6 py-3 gap-4"
                 style={{ left: sidebarOpen ? 280 : 20 }}>

              {/* Left: completion badge */}
              <div className="flex items-center gap-2">
                {isCompleted && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600
                                   font-semibold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M5 13l4 4L19 7" />
                    </svg>
                    Completed
                  </span>
                )}
                {!isCompleted && lesson?.duration_mins && (
                  <span className="text-xs text-gray-400">
                    {lesson.duration_mins} min
                  </span>
                )}
              </div>

              {/* Right: navigation */}
              <div className="flex items-center gap-3">
                {/* Prev lesson */}
                {currentIdx > 0 && allLessons[currentIdx - 1] && (
                  <button
                    onClick={() =>
                      navigate(`/learn/${courseId}/${allLessons[currentIdx - 1].id}`)
                    }
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm
                               font-semibold text-gray-600 hover:border-[#1a24cc]
                               hover:text-[#1a24cc] transition-colors"
                  >
                    ← Prev
                  </button>
                )}

                {/* Next / Finish */}
                {!loadingCourse && enrollmentId && (
                  <button
                    onClick={handleNext}
                    disabled={completing}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl
                               bg-[#1a24cc] text-white text-sm font-semibold
                               hover:bg-[#1219a0] active:scale-[.98] transition-all
                               disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {completing
                      ? 'Saving…'
                      : isLast
                        ? '🎉 Finish Course'
                        : 'Next Content →'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
