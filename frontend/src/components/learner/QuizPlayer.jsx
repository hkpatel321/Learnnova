import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';

const defaultPoints = {
  points_1: 20,
  points_2: 12,
  points_3: 8,
  points_4: 4,
};

const badgeLevels = [
  { name: 'Newbie', min: 0, max: 20, icon: '🥈' },
  { name: 'Explorer', min: 21, max: 40, icon: '🥉' },
  { name: 'Achiever', min: 41, max: 60, icon: '🏅' },
  { name: 'Specialist', min: 61, max: 80, icon: '🎖️' },
  { name: 'Expert', min: 81, max: 100, icon: '🏆' },
  { name: 'Master', min: 101, max: Number.POSITIVE_INFINITY, icon: '👑' },
];

const getBadgeMeta = (points) => {
  const current = badgeLevels.find((b) => points >= b.min && points <= b.max) || badgeLevels[0];
  const next = badgeLevels.find((b) => b.min > current.min) || null;
  const range = Number.isFinite(current.max) ? current.max - current.min + 1 : 1;
  const progress = Number.isFinite(current.max) ? ((points - current.min) / range) * 100 : 100;
  return { current, next, progress: Math.max(0, Math.min(100, progress)) };
};

const getQuizStorageKey = (quizId) => `learnnova.quiz-progress.${quizId}`;

const readSavedQuizProgress = (quizId) => {
  if (!quizId || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getQuizStorageKey(quizId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearSavedQuizProgress = (quizId) => {
  if (!quizId || typeof window === 'undefined') return;
  window.localStorage.removeItem(getQuizStorageKey(quizId));
};

const normalizeQuizPayload = (payload, fallbackQuizId) => {
  const source = payload?.quiz || payload || {};
  const questions = Array.isArray(source.questions)
    ? source.questions.map((question) => ({
        ...question,
        text: question.questionText || question.question_text || question.text || '',
        options: Array.isArray(question.options)
          ? question.options.map((option) => ({
              ...option,
              text: option.optionText || option.option_text || option.text || '',
            }))
          : [],
      }))
    : [];

  return {
    id: source.id || fallbackQuizId,
    title: source.title || 'Quiz',
    questions,
    pointsFirstAttempt:
      payload?.rewards?.attempt1 ?? source.pointsAttempt1 ?? payload?.points_1 ?? defaultPoints.points_1,
    pointsSecondAttempt:
      payload?.rewards?.attempt2 ?? source.pointsAttempt2 ?? payload?.points_2 ?? defaultPoints.points_2,
    pointsThirdAttempt:
      payload?.rewards?.attempt3 ?? source.pointsAttempt3 ?? payload?.points_3 ?? defaultPoints.points_3,
    pointsFourthPlusAttempt:
      payload?.rewards?.attempt4plus ?? source.pointsAttempt4plus ?? payload?.points_4 ?? defaultPoints.points_4,
    attemptCount: Number(payload?.attemptCount ?? payload?.attempt_count ?? source.attemptCount ?? 0),
    attempts: Array.isArray(payload?.attempts || source.attempts) ? payload?.attempts || source.attempts : [],
    alreadyCompleted: Boolean(payload?.alreadyCompleted || payload?.already_completed || source.alreadyCompleted || source.already_completed),
    bestCorrect: Number(payload?.bestCorrect ?? payload?.best_correct ?? source.bestCorrect ?? 0),
    bestPoints: Number(payload?.bestPoints ?? payload?.best_points ?? source.bestPoints ?? 0),
    completedAt: payload?.completedAt || payload?.completed_at || source.completedAt || source.completed_at || null,
  };
};

const QuizPlayer = ({ quizId, onComplete }) => {
  const [viewState, setViewState] = useState('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [resultData, setResultData] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [countUpPoints, setCountUpPoints] = useState(0);
  const [runtimeQuiz, setRuntimeQuiz] = useState(null);
  const [savedProgress, setSavedProgress] = useState(() => readSavedQuizProgress(quizId));
  const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
  const [tabWarningVisible, setTabWarningVisible] = useState(false);
  const [isEndingQuiz, setIsEndingQuiz] = useState(false);

  const { data: quizMeta, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz-player-meta', quizId],
    queryFn: async () => {
      const res = await axios.get(`/quizzes/${quizId}`);
      return normalizeQuizPayload(res.data?.data, quizId);
    },
    enabled: !!quizId,
    retry: false,
  });

  const quiz = runtimeQuiz || quizMeta || normalizeQuizPayload(null, quizId);
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const totalQuestions = questions.length;
  const attemptCount = Number(quiz?.attemptCount || quiz?.attempt_count || 0);
  const attempts = quiz?.attempts || [];
  const points1 = Number(quiz?.pointsFirstAttempt ?? quiz?.points_1 ?? defaultPoints.points_1);
  const points2 = Number(quiz?.pointsSecondAttempt ?? quiz?.points_2 ?? defaultPoints.points_2);
  const points3 = Number(quiz?.pointsThirdAttempt ?? quiz?.points_3 ?? defaultPoints.points_3);
  const points4 = Number(quiz?.pointsFourthPlusAttempt ?? quiz?.points_4 ?? defaultPoints.points_4);
  const currentQuestion = questions[currentIndex];
  const resumePromptVisible = !!(
    savedProgress?.selectedAnswers &&
    Object.keys(savedProgress.selectedAnswers).length > 0 &&
    !(quiz?.already_completed || quiz?.alreadyCompleted)
  );

  useEffect(() => {
    if (quiz?.already_completed || quiz?.alreadyCompleted) {
      const timer = setTimeout(() => setViewState('already_completed'), 0);
      return () => clearTimeout(timer);
    }
  }, [quiz?.already_completed, quiz?.alreadyCompleted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedProgress(readSavedQuizProgress(quizId));
      setSelectedAnswers({});
      setCurrentIndex(0);
      setResultData(null);
      setReviewOpen(false);
      setCountUpPoints(0);
      setRuntimeQuiz(null);
      setFullscreenPrompt(false);
      setTabWarningVisible(false);
      setIsEndingQuiz(false);
      setViewState('intro');
    }, 0);

    return () => clearTimeout(timer);
  }, [quizId]);

  useEffect(() => {
    if (viewState !== 'result' || !resultData?.passed) return;
    
    const target = Number(resultData.pointsEarned || 0);
    if (target <= 0) return;
    
    const syncTimer = setTimeout(() => {
      setCountUpPoints(0);
      const step = Math.max(1, Math.ceil(target / 20));
      const timer = setInterval(() => {
        setCountUpPoints((prev) => {
          const next = prev + step;
        if (next >= target) {
          clearInterval(timer);
          return target;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, 0);
    
    return () => clearTimeout(syncTimer);
  }, [viewState, resultData]);

  useEffect(() => {
    if (typeof window === 'undefined' || !quizId) return;
    if (viewState !== 'question') return;

    const payload = {
      quizId,
      selectedAnswers,
      currentIndex,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(getQuizStorageKey(quizId), JSON.stringify(payload));
  }, [quizId, viewState, selectedAnswers, currentIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (viewState !== 'question') return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [viewState]);

  const requestFullscreen = async () => {
    if (typeof document === 'undefined') return false;
    if (document.fullscreenElement) return true;

    try {
      await document.documentElement.requestFullscreen();
      setFullscreenPrompt(false);
      return true;
    } catch {
      setFullscreenPrompt(true);
      return false;
    }
  };

  const exitFullscreen = async () => {
    if (typeof document === 'undefined' || !document.fullscreenElement) return;

    try {
      await document.exitFullscreen();
    } catch {
      // Ignore exit failures and let the browser settle naturally.
    }
  };

  useEffect(() => {
    if (viewState !== 'question') return undefined;

    const fullscreenTimer = setTimeout(() => {
      requestFullscreen();
    }, 0);

    const handleFullscreenChange = () => {
      if (isEndingQuiz) return;
      if (!document.fullscreenElement) {
        setFullscreenPrompt(true);
      } else {
        setFullscreenPrompt(false);
      }
    };

    const handleVisibilityChange = () => {
      if (isEndingQuiz) return;
      if (document.hidden) return;

      setTabWarningVisible(true);
      toast.error('Tab switching is disabled during the quiz. Return to the quiz or end it.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(fullscreenTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewState, isEndingQuiz]);

  const handleEndQuiz = async () => {
    setIsEndingQuiz(true);
    clearSavedQuizProgress(quizId);
    setSavedProgress(null);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResultData(null);
    setReviewOpen(false);
    setFullscreenPrompt(false);
    setTabWarningVisible(false);
    setViewState('intro');
    await exitFullscreen();
    setIsEndingQuiz(false);
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.get(`/quiz-attempts/${quizId}/start`);
      return normalizeQuizPayload(res.data?.data, quizId);
    },
    onSuccess: (data) => {
      setRuntimeQuiz(data);
      if (savedProgress?.selectedAnswers && Object.keys(savedProgress.selectedAnswers).length > 0) {
        const nextQuestions = data.questions || quiz.questions || [];
        setSelectedAnswers(savedProgress.selectedAnswers || {});
        setCurrentIndex(Math.max(0, Math.min(savedProgress.currentIndex || 0, Math.max(nextQuestions.length - 1, 0))));
      } else {
        setSelectedAnswers({});
        setCurrentIndex(0);
      }
      setReviewOpen(false);
      setViewState('question');
    },
    onError: () => toast.error('Failed to start quiz'),
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`/quiz-attempts/${quizId}/submit`, payload);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      const correct = Number(data.correctAnswers ?? data.correct ?? data.correctCount ?? 0);
      const total = Number(data.totalQuestions ?? data.total ?? totalQuestions);
      const passed = Boolean(data.passed ?? (correct >= total && total > 0));
      const pointsEarned = Number(data.pointsEarned ?? data.points_earned ?? 0);
      const attemptedAt = data.attemptedAt || new Date().toISOString();

      setResultData({
        passed,
        correct,
        total,
        pointsEarned,
        answersReview: data.answersReview || data.review || [],
        totalPoints: Number(data.totalPoints || data.total_points || 0),
        attemptedAt,
      });

      if (pointsEarned > 0) {
        toast(`${pointsEarned} points earned! 🏆`, { icon: '⭐', style: { background: '#F59E0B', color: 'black' } });
      }

      setRuntimeQuiz((prev) => ({
        ...(prev || quiz),
        attempt_count: attemptCount + 1,
        attempts: [
          { attempt: attemptCount + 1, points: pointsEarned, date: attemptedAt },
          ...(Array.isArray(attempts) ? attempts : []),
        ],
      }));

      clearSavedQuizProgress(quizId);
      setSavedProgress(null);
      exitFullscreen();
      setFullscreenPrompt(false);
      setTabWarningVisible(false);
      setReviewOpen(!passed);
      setViewState('result');
    },
    onError: () => toast.error('Failed to submit quiz'),
  });

  const progressPercent = totalQuestions
    ? Math.round(((currentIndex + (viewState === 'question' ? 1 : 0)) / totalQuestions) * 100)
    : 0;

  const selectedOptionId = currentQuestion ? selectedAnswers[currentQuestion.id] : null;
  const pointsTotal = Number(resultData?.totalPoints || 0);
  const badge = getBadgeMeta(pointsTotal);

  const submitAnswers = () => {
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selectedAnswers[q.id],
    }));
    submitMutation.mutate({ answers });
  };

  if (viewState === 'already_completed') {
    return (
      <div className="max-w-xl mx-auto bg-white border border-emerald-200 rounded-2xl p-8 text-center">
        <p className="text-2xl mb-2">✅</p>
        <h2 className="text-xl font-bold text-emerald-600">You've already completed this quiz!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Best score: {quiz.best_correct || quiz.bestCorrect || totalQuestions}/{totalQuestions}
        </p>
        <p className="text-sm text-gray-600">Points earned: +{quiz.best_points || quiz.bestPoints || 0} pts</p>
        <p className="text-xs text-gray-500 mt-1">{quiz.completed_at ? new Date(quiz.completed_at).toLocaleString() : ''}</p>
        <button
          type="button"
          onClick={() => setViewState('intro')}
          className="mt-5 px-4 py-2 rounded-lg border border-[#2D31D4] text-[#2D31D4] text-sm font-medium"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  if (viewState === 'intro') {
    return (
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl p-8">
        {quizLoading ? (
          <div className="mb-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#2D31D4]" />
          </div>
        ) : null}
        <div className="w-12 h-12 rounded-full bg-[#2D31D4] text-white mx-auto flex items-center justify-center text-xl">❓</div>
        <h2 className="text-center font-bold text-xl mt-4 text-gray-900">{quiz.title || 'Quiz'}</h2>

        <div className="grid grid-cols-2 gap-3 bg-[#F4F5FF] rounded-xl p-4 mt-4 text-sm text-gray-700">
          <p>📝 {totalQuestions} Questions</p>
          <p>🔄 Multiple attempts</p>
          <p>🏆 Up to {points1} pts (1st try)</p>
          <p>✓ Get all correct to pass</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-4 text-sm md:text-xs">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">1st: {points1}pts</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">2nd: {points2}pts</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">3rd: {points3}pts</span>
          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">4th+: {points4}pts</span>
        </div>

        {attemptCount > 0 ? (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Previous attempts</p>
            <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
              <div className="grid grid-cols-3 bg-gray-50 text-gray-500 px-3 py-2 font-medium">
                <span>Attempt #</span>
                <span>Points Earned</span>
                <span>Date</span>
              </div>
              {(attempts || []).slice(0, 4).map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 px-3 py-2 border-t border-gray-100 text-gray-700">
                  <span>#{row.attempt || idx + 1}</span>
                  <span>{row.points || 0}</span>
                  <span>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {resumePromptVisible ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Saved progress found</p>
            <p className="mt-1">Your previous answers are saved on this device and will be restored when you resume.</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="mt-6 w-full h-12 rounded-xl bg-[#2D31D4] text-white font-semibold inline-flex items-center justify-center gap-2"
        >
          {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {resumePromptVisible ? 'Resume Quiz →' : 'Start Quiz →'}
        </button>

        {resumePromptVisible ? (
          <button
            type="button"
            onClick={() => {
              clearSavedQuizProgress(quizId);
              setSavedProgress(null);
              setSelectedAnswers({});
              setCurrentIndex(0);
            }}
            className="mt-3 w-full h-11 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
          >
            Start Fresh
          </button>
        ) : null}
      </div>
    );
  }

  if (viewState === 'question') {
    return (
      <div>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Question {currentIndex + 1} of {totalQuestions}</p>
            <button
              type="button"
              onClick={handleEndQuiz}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              End Quiz
            </button>
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#2D31D4] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{quiz.title || 'Quiz'}</p>
        </div>

        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 mt-6">
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-[#2D31D4] text-white">
            Question {currentIndex + 1}
          </span>
          <h3 className="text-[20px] font-semibold text-gray-900 mt-3">{currentQuestion?.text || currentQuestion?.questionText || currentQuestion?.question_text}</h3>

          <div className="mt-6 flex flex-col gap-3">
            {(currentQuestion?.options || []).map((opt) => {
              const selected = String(selectedOptionId) === String(opt.id);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() =>
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: opt.id,
                    }))
                  }
                  className={`w-full text-left p-5 md:p-4 rounded-xl border transition-colors ${
                    selected
                      ? 'bg-[#EEF0FF] border-2 border-[#2D31D4] border-l-4'
                      : 'bg-white border-gray-200 hover:bg-[#F4F5FF] hover:border-[#2D31D4]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 w-4 h-4 rounded-full border ${selected ? 'border-[#2D31D4] bg-[#2D31D4]' : 'border-gray-400'}`} />
                    <span className="flex-1 text-sm text-gray-800">{opt.text || opt.optionText || opt.option_text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                disabled={!selectedOptionId}
                onClick={() => setCurrentIndex((idx) => idx + 1)}
                className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium disabled:opacity-60"
              >
                Proceed →
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedOptionId || submitMutation.isPending}
                onClick={submitAnswers}
                className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2"
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Quiz →
              </button>
            )}
          </div>
        </div>

        {fullscreenPrompt || tabWarningVisible ? (
          <div className="fixed inset-0 z-[100] bg-black/60 px-4 flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {tabWarningVisible ? 'Return to the quiz window' : 'Full screen is required'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {tabWarningVisible
                  ? 'This quiz is running in protected mode. Switch back to the quiz and continue in full screen, or end the quiz and return to normal mode.'
                  : 'Please keep this quiz in full screen until you submit or end the attempt.'}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setTabWarningVisible(false);
                    await requestFullscreen();
                  }}
                  className="h-11 rounded-xl bg-[#2D31D4] text-white text-sm font-semibold"
                >
                  Return to Full Screen
                </button>
                <button
                  type="button"
                  onClick={handleEndQuiz}
                  className="h-11 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
                >
                  End Quiz
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const passed = !!resultData?.passed;
  const answersReview = resultData?.answersReview || [];

  return (
    <div className="max-w-2xl mx-auto">
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`} style={{ animation: 'popIn 220ms ease-out' }}>
          {passed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
        </div>
        <h2 className={`mt-4 text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>
          {passed ? 'Quiz Complete!' : 'Not quite right'}
        </h2>
        <p className="mt-1 text-gray-500">{resultData?.correct} / {resultData?.total} Correct</p>
        {!passed ? <p className="text-sm text-gray-500 mt-1">You need all correct to earn points.</p> : null}

        {passed ? (
          <div className="mt-6 bg-amber-50 rounded-2xl p-6 text-center">
            <p className="text-4xl font-extrabold text-amber-500">+{countUpPoints} Points!</p>
            <p className="text-sm text-gray-500">added to your total</p>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-800">{badge.current.icon} {badge.current.name}</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#2D31D4]" style={{ width: `${badge.progress}%` }} />
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {badge.next ? `Only ${Math.max(0, badge.next.min - pointsTotal)} pts to ${badge.next.name}!` : 'You reached top badge!'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-left">
          <button
            type="button"
            onClick={() => setReviewOpen((prev) => !prev)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-between"
          >
            <span>Review Answers</span>
            <span>{reviewOpen ? '▲' : '▼'}</span>
          </button>

          {reviewOpen ? (
            <div className="mt-3 space-y-2">
              {answersReview.map((q, idx) => {
                const isCorrect = !!q.isCorrect;
                return (
                  <div key={q.questionId || idx} className={`rounded-lg border p-3 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-sm font-medium text-gray-900">
                      {isCorrect ? '✓' : '✗'} {q.questionText || `Question ${idx + 1}`}
                    </p>
                    {!isCorrect && q.selectedOptionText ? (
                      <p className="text-xs text-red-700 mt-1">Your answer: {q.selectedOptionText}</p>
                    ) : null}
                    <p className="text-xs text-green-700 mt-1">Correct answer: {q.correctOptionText || '-'}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {passed ? (
          <button
            type="button"
            onClick={async () => {
              await exitFullscreen();
              onComplete?.();
            }}
            className="mt-6 px-5 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium"
          >
            Close
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              clearSavedQuizProgress(quizId);
              setSavedProgress(null);
              setViewState('intro');
              setCurrentIndex(0);
              setSelectedAnswers({});
              setResultData(null);
              setReviewOpen(false);
              setFullscreenPrompt(false);
              setTabWarningVisible(false);
              await exitFullscreen();
            }}
            className="mt-6 w-full h-11 rounded-xl bg-[#2D31D4] text-white text-sm font-semibold"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;
