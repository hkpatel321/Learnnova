import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import QuizPlayer from '../../components/learner/QuizPlayer';
import ErrorState from '../../components/ui/ErrorState';

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

const getYouTubeVideoId = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(pathParts[0])) {
        return pathParts[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getPlayableVideoSource = (url) => {
  const youtubeId = getYouTubeVideoId(url);

  if (youtubeId) {
    return {
      type: 'youtube',
      videoId: youtubeId,
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  return {
    type: 'direct',
    src: url,
  };
};

const LessonStatusIcon = ({ status, current }) => {
  if (status === 'completed') {
    return (
      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
        <Check className="w-3 h-3" />
      </span>
    );
  }
  if (current) {
    return (
      <span className="w-4 h-4 rounded-full border border-[#2D31D4] flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2D31D4] animate-pulse" />
      </span>
    );
  }
  return <span className="w-4 h-4 rounded-full border border-gray-300" />;
};

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playingVideoLessonId, setPlayingVideoLessonId] = useState(null);
  const trackedActivityRef = useRef({});
  const trackedSecondsRef = useRef(0);
  const reportedMinutesRef = useRef(0);

  const [confettiPieces, setConfettiPieces] = useState([]);

  useEffect(() => {
    let timer;
    if (showConfetti) {
      timer = setTimeout(() => {
        setConfettiPieces(
          Array.from({ length: 20 }).map(() => ({
            left: `${Math.random() * 100}%`,
            animationDuration: `${2 + Math.random() * 1.2}s`,
            animationDelay: `${Math.random() * 0.4}s`,
          }))
        );
      }, 0);
    } else {
      timer = setTimeout(() => setConfettiPieces([]), 0);
    }
    return () => clearTimeout(timer);
  }, [showConfetti]);

  const { data: lesson, isLoading: lessonLoading, error: lessonError, refetch: refetchLesson } = useQuery({
    queryKey: ['lesson-detail', lessonId],
    queryFn: async () => {
      const res = await axios.get(`/lessons/${lessonId}`);
      return res.data?.data?.lesson || res.data?.lesson || res.data;
    },
    retry: false,
  });

  const { data: progress, isLoading: progressLoading, error: progressError, refetch: refetchProgress } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      const res = await axios.get(`/progress/courses/${courseId}`);
      return res.data?.data || res.data;
    },
    retry: false,
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (id) => axios.post(`/progress/lessons/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
    },
    onError: () => toast.error('Failed to update lesson progress'),
  });

  const completeCourseMutation = useMutation({
    mutationFn: async () => axios.post(`/progress/courses/${courseId}/complete`),
    onSuccess: () => {
      toast.success('Congratulations! Course completed 🎓🎉');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
    },
    onError: () => toast.error('Failed to complete course'),
  });

  const trackActivityMutation = useMutation({
    mutationFn: async (payload) => axios.post('/users/me/activity-events', payload),
  });

  const addTimeSpentMutation = useMutation({
    mutationFn: async ({ targetLessonId, minutesSpent }) =>
      axios.post(`/progress/lessons/${targetLessonId}/time-spent`, { minutesSpent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
    },
  });

  const lessons = useMemo(() => {
    const fromProgress =
      progress?.lessons ||
      progress?.course?.lessons ||
      progress?.courseLessons ||
      [];
    if (Array.isArray(fromProgress) && fromProgress.length) return fromProgress;
    const fromLesson = lesson?.course?.lessons || lesson?.courseLessons || [];
    if (Array.isArray(fromLesson)) return fromLesson;
    return [];
  }, [progress, lesson]);

  const completedIds = new Set(progress?.completedLessonIds || progress?.completed_lessons || []);
  const currentIndex = lessons.findIndex((item) => String(item.id) === String(lessonId));
  const currentLesson = lesson || lessons[currentIndex] || null;
  const contentType = (currentLesson?.type || '').toLowerCase();
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const doneCount = lessons.filter((item) => completedIds.has(item.id) || item.status === 'completed').length;
  const totalCount = lessons.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const allComplete = totalCount > 0 && doneCount >= totalCount;

  const courseTitle =
    progress?.courseTitle ||
    progress?.course?.title ||
    lesson?.courseTitle ||
    lesson?.course?.title ||
    'Course';

  const recordActivity = useCallback((activityType, extra = {}) => {
    const activityKey = `${lessonId}:${activityType}:${extra.scope || 'default'}`;
    if (extra.once && trackedActivityRef.current[activityKey]) {
      return;
    }

    if (extra.once) {
      trackedActivityRef.current[activityKey] = true;
    }

    trackActivityMutation.mutate({
      activityType,
      courseId,
      lessonId,
      metadata: extra.metadata || null,
    });
  }, [courseId, lessonId, trackActivityMutation]);

  useEffect(() => {
    trackedActivityRef.current = {};
    trackedSecondsRef.current = 0;
    reportedMinutesRef.current = 0;
  }, [lessonId]);

  useEffect(() => {
    if (!currentLesson) return;

    if (contentType === 'document') {
      recordActivity('document_open', {
        once: true,
        scope: 'lesson-open',
      });
    }

    if (contentType === 'image') {
      recordActivity('image_view', {
        once: true,
        scope: 'lesson-view',
      });
    }
  }, [contentType, currentLesson, lessonId, recordActivity]);

  useEffect(() => {
    if (!lessonId) return undefined;

    const tick = window.setInterval(() => {
      const isVisible = typeof document === 'undefined' ? true : document.visibilityState === 'visible';
      const shouldTrack =
        isVisible &&
        (contentType === 'video'
          ? playingVideoLessonId === lessonId
          : ['document', 'image', 'quiz'].includes(contentType));

      if (!shouldTrack) return;

      trackedSecondsRef.current += 15;
      const wholeMinutes = Math.floor(trackedSecondsRef.current / 60);
      const pendingMinutes = wholeMinutes - reportedMinutesRef.current;

      if (pendingMinutes > 0 && !addTimeSpentMutation.isPending) {
        reportedMinutesRef.current += pendingMinutes;
        addTimeSpentMutation.mutate({
          targetLessonId: lessonId,
          minutesSpent: pendingMinutes,
        });
      }
    }, 15000);

    return () => window.clearInterval(tick);
  }, [addTimeSpentMutation, contentType, lessonId, playingVideoLessonId]);

  const handleNavigateLesson = (targetId) => {
    navigate(`/learn/${courseId}/${targetId}`);
  };

  const handleNext = async () => {
    await completeLessonMutation.mutateAsync(lessonId);
    if (nextLesson?.id) {
      handleNavigateLesson(nextLesson.id);
      return;
    }
    if (allComplete || doneCount + 1 >= totalCount) {
      setShowCompletionBanner(true);
    }
  };

  if (lessonLoading || progressLoading) {
    return (
      <div className="h-screen overflow-hidden flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2D31D4] animate-spin" />
      </div>
    );
  }

  if (lessonError || progressError) {
    const message =
      lessonError?.response?.data?.message ||
      progressError?.response?.data?.message ||
      'You do not currently have access to this course content.';

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl">
          <ErrorState
            title="Course Access Required"
            message={message}
            onRetry={() => {
              refetchLesson();
              refetchProgress();
            }}
          />
          <div className="px-6 pb-6 flex justify-center">
            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }
  const attachments = currentLesson?.attachments || [];
  const videoSource = getPlayableVideoSource(currentLesson?.video_url || currentLesson?.videoUrl);

  return (
    <div className="h-screen overflow-hidden bg-[#F4F5FF] relative">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {showConfetti ? (
        <div className="pointer-events-none absolute inset-0 z-[70] overflow-hidden">
          {confettiPieces.map((piece, idx) => (
            <span
              key={idx}
              className="absolute top-0 w-2.5 h-2.5 rounded-sm"
              style={{
                left: piece.left,
                backgroundColor: ['#2D31D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5],
                animation: `confettiFall ${piece.animationDuration} linear forwards`,
                animationDelay: piece.animationDelay,
              }}
            />
          ))}
        </div>
      ) : null}

      <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
        <button
          type="button"
          onClick={() => navigate(`/courses/${courseId}`)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <p className="text-sm text-gray-500 truncate max-w-[45%]">{courseTitle}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{doneCount}/{totalCount} lessons</span>
          <span className="px-3 py-1 rounded-full bg-[#2D31D4] text-white text-xs font-medium">
            {percent}%
          </span>
        </div>
      </header>

      <div className="flex relative h-[calc(100vh-48px)]">
        <aside className={`absolute md:relative z-40 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 h-full ${sidebarOpen ? 'w-full md:w-80' : 'w-0'}`}>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 md:-right-4 md:top-1/2 md:-translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center z-50 text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4 text-gray-600" />
          </button>

          <div className="p-4 border-b border-gray-200">
            <p className="text-[13px] font-semibold text-gray-800 line-clamp-2">{courseTitle}</p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#2D31D4]" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{percent}% Complete</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {lessons.map((item) => {
              const active = String(item.id) === String(lessonId);
              const status = completedIds.has(item.id) || item.status === 'completed' ? 'completed' : 'not_started';
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigateLesson(item.id)}
                    className={`w-full text-left rounded-lg p-2.5 mb-1 cursor-pointer transition-colors ${
                      active ? 'bg-[#EEF0FF] text-[#2D31D4]' : 'hover:bg-[#F4F5FF] text-gray-800'
                    } ${status === 'completed' ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <LessonStatusIcon status={status} current={active} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.title || 'Untitled lesson'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${typeStyles[item.type] || 'bg-gray-100 text-gray-700'}`}>
                            {typeLabel[item.type] || item.type || 'Lesson'}
                          </span>
                          <span className="text-xs text-gray-500">{item.durationMinutes || item.duration || 0} min</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {(active || status === 'completed') && Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                    <div className="ml-6 mb-2 space-y-1">
                      {item.attachments.map((att) => (
                        <a
                          key={att.id || att.url}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-blue-600 hover:underline"
                        >
                          📎 {att.label || att.name || 'Attachment'}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed bottom-[4.5rem] right-4 md:absolute md:left-2 md:top-1/2 md:-translate-y-1/2 w-12 h-12 md:w-8 md:h-8 rounded-full bg-[#2D31D4] md:bg-white text-white md:text-gray-600 border border-transparent md:border-gray-200 shadow-xl md:shadow flex items-center justify-center z-40"
          >
            <span className="md:hidden flex items-center justify-center"><ChevronRight className="w-6 h-6" /></span>
            <span className="hidden md:flex"><ChevronRight className="w-4 h-4" /></span>
          </button>
        ) : null}

        <main className="flex-1 overflow-y-auto bg-[#F4F5FF]">
          <div className="max-w-4xl mx-auto my-6 px-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-plus-jakarta-sans text-gray-900">
                {currentLesson?.title || 'Lesson'}
              </h2>
              <div
                className="text-gray-600 mt-2 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentLesson?.description || '' }}
              />
              <span className={`inline-block mt-3 text-xs font-medium px-2.5 py-1 rounded-full ${typeStyles[contentType] || 'bg-gray-100 text-gray-700'}`}>
                {typeLabel[contentType] || contentType || 'Lesson'}
              </span>
            </div>

            <div>
              {contentType === 'video' ? (
                <div className="space-y-3">
                  <div className="aspect-video rounded-xl overflow-hidden bg-black">
                    {videoSource.type === 'youtube' ? (
                      <iframe
                        src={videoSource.src}
                        title={currentLesson?.title || 'Lesson video'}
                        className="block h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        onLoad={() => {
                          recordActivity('video_watch', {
                            once: true,
                            scope: 'youtube-ready',
                          });
                        }}
                      />
                    ) : (
                      <ReactPlayer
                        src={videoSource.src}
                        width="100%"
                        height="100%"
                        controls
                        playsInline
                        onReady={() => {
                          recordActivity('video_watch', {
                            once: true,
                            scope: 'ready',
                          });
                        }}
                        onPlay={() => {
                          setPlayingVideoLessonId(lessonId);
                          recordActivity('video_watch', {
                            once: true,
                            scope: 'play',
                          });
                        }}
                        onPause={() => setPlayingVideoLessonId(null)}
                        onEnded={() => setPlayingVideoLessonId(null)}
                      />
                    )}
                  </div>

                  {videoSource.type === 'youtube' ? (
                    <div className="flex justify-end">
                      <a
                        href={videoSource.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg border border-[#2D31D4] px-4 py-2 text-sm font-medium text-[#2D31D4]"
                      >
                        Open on YouTube
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {contentType === 'document' ? (
                <div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <object
                      data={currentLesson?.file_url || currentLesson?.fileUrl}
                      type="application/pdf"
                      width="100%"
                      height="600"
                      className="rounded-xl border border-gray-100 bg-white"
                    >
                      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl bg-gray-50 p-6 text-center">
                        <p className="text-base font-semibold text-gray-900">Preview unavailable in-browser</p>
                        <p className="mt-2 max-w-md text-sm text-gray-600">
                          This document source does not allow embedded preview here. Open it in a new tab or download it instead.
                        </p>
                      </div>
                    </object>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <a
                        href={currentLesson?.file_url || currentLesson?.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          recordActivity('document_open', {
                            once: true,
                            scope: 'new-tab',
                            metadata: { source: 'new-tab' },
                          });
                        }}
                        className="inline-flex items-center rounded-lg bg-[#2D31D4] px-4 py-2 text-sm font-medium text-white"
                      >
                        Open Document
                      </a>
                      {currentLesson?.allow_download || currentLesson?.allowDownload ? (
                        <a
                          href={currentLesson?.file_url || currentLesson?.fileUrl}
                          download
                          onClick={() => {
                            recordActivity('document_download', {
                              metadata: { source: 'lesson-file' },
                            });
                          }}
                          className="inline-flex items-center rounded-lg border border-[#2D31D4] px-4 py-2 text-sm font-medium text-[#2D31D4]"
                        >
                          Download File
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      PDF preview uses your browser directly. If the source blocks embedding, use "Open Document" or download the file.
                    </p>
                  </div>
                </div>
              ) : null}

              {contentType === 'image' ? (
                <div>
                  <img
                    src={currentLesson?.image_url || currentLesson?.imageUrl || currentLesson?.file_url || currentLesson?.fileUrl}
                    alt={currentLesson?.title || 'Lesson image'}
                    className="max-h-[70vh] mx-auto rounded-xl object-contain"
                    onLoad={() => {
                      recordActivity('image_view', {
                        once: true,
                        scope: 'image-load',
                      });
                    }}
                  />
                  {currentLesson?.allow_download || currentLesson?.allowDownload ? (
                    <a
                      href={currentLesson?.image_url || currentLesson?.imageUrl || currentLesson?.file_url || currentLesson?.fileUrl}
                      download
                      onClick={() => {
                        recordActivity('image_download', {
                          metadata: { source: 'lesson-image' },
                        });
                      }}
                      className="inline-block mt-3 px-4 py-2 rounded-lg border border-[#2D31D4] text-[#2D31D4] text-sm font-medium"
                    >
                      ⬇ Download Image
                    </a>
                  ) : null}
                </div>
              ) : null}

              {contentType === 'quiz' ? (
                <QuizPlayer
                  quizId={currentLesson?.quiz_id || currentLesson?.quizId}
                  courseId={courseId}
                  onComplete={async () => {
                    recordActivity('quiz_attempt', {
                      metadata: { outcome: 'completed' },
                    });
                    await completeLessonMutation.mutateAsync(lessonId);
                    toast.success('Quiz marked complete');
                  }}
                />
              ) : null}

              {attachments.length > 0 ? (
                <div className="mt-5 rounded-xl bg-white border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Attachments</p>
                  <div className="space-y-1">
                    {attachments.map((att) => (
                      <a
                        key={att.id || att.url}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        📎 {att.label || att.name || 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {!showCompletionBanner ? (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            disabled={!prevLesson}
            onClick={() => prevLesson && handleNavigateLesson(prevLesson.id)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-40"
          >
            ← Previous
          </button>
          <p className="text-sm text-gray-500">
            Lesson {Math.max(1, currentIndex + 1)} of {Math.max(1, totalCount)}
          </p>
          <button
            type="button"
            onClick={handleNext}
            disabled={completeLessonMutation.isPending}
            className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium disabled:opacity-70 inline-flex items-center gap-2"
          >
            {completeLessonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Next Lesson →
          </button>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-emerald-500 text-white p-4 flex items-center justify-between">
          <p className="font-medium">🎉 You've completed all lessons in this course!</p>
          <button
            type="button"
            onClick={() => completeCourseMutation.mutate()}
            disabled={completeCourseMutation.isPending}
            className="px-4 py-2 rounded-lg bg-white text-emerald-700 text-sm font-semibold"
          >
            Complete This Course
          </button>
        </div>
      )}
    </div>
  );
}
