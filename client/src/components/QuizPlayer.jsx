import { useState, useEffect } from 'react';
import api from '../lib/api';
import PointsPopup from './PointsPopup';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Points the user will earn on next attempt (attempt_count is 0-based past attempts) */
function nextAttemptPoints(quiz, attemptCount) {
  if (!quiz) return null;
  const n = attemptCount + 1; // this will be attempt number
  if (n === 1) return quiz.points_attempt_1;
  if (n === 2) return quiz.points_attempt_2;
  if (n === 3) return quiz.points_attempt_3;
  return quiz.points_attempt_4plus;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Thin progress bar showing question completion ─────────────────────────────
function QuestionProgress({ current, total }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#1a24cc] uppercase tracking-widest">
          Question {current} of {total}
        </span>
        <span className="text-xs text-gray-400">{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1a24cc] rounded-full transition-all duration-400"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Radio option row ──────────────────────────────────────────────────────────
function OptionRow({ option, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(option.id)}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2
                  text-left transition-all duration-150
        ${selected
          ? 'border-[#1a24cc] bg-[#eef2ff]'
          : 'border-gray-200 bg-white hover:border-[#1a24cc]/40 hover:bg-[#f8f9ff]'
        }`}
    >
      {/* Radio circle */}
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                        flex-shrink-0 transition-colors
        ${selected ? 'border-[#1a24cc] bg-[#1a24cc]' : 'border-gray-300 bg-white'}`}>
        {selected && (
          <span className="w-2 h-2 rounded-full bg-white block" />
        )}
      </span>
      {/* Text */}
      <span className={`text-sm font-medium ${selected ? 'text-[#1a24cc]' : 'text-gray-700'}`}>
        {option.option_text}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────────────────

// ── Screen 1: Intro ───────────────────────────────────────────────────────────
function IntroScreen({ quiz, attempts, loadingAttempts, onStart, starting }) {
  const pts = nextAttemptPoints(quiz, attempts?.attempt_count ?? 0);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Info card */}
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{quiz?.title ?? 'Quiz'}</h2>

        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <span className="text-[#1a24cc] font-bold">—</span>
            Total Questions:{' '}
            <span className="font-semibold text-gray-800">
              {quiz?.questions?.length ?? '…'}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#1a24cc] font-bold">—</span>
            Multiple Attempts Allowed
          </li>
          {pts != null && (
            <li className="flex items-center gap-2">
              <span className="text-[#1a24cc] font-bold">—</span>
              Points for this attempt:{' '}
              <span className="font-semibold text-[#1a24cc]">{pts} pts</span>
            </li>
          )}
        </ul>

        {/* Previous attempts */}
        {!loadingAttempts && attempts?.attempt_count > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Previous attempts:{' '}
              <span className="font-semibold text-gray-800">{attempts.attempt_count}</span>
            </p>
            {attempts.last_correct_answers != null && (
              <p className="text-sm text-gray-500 mt-0.5">
                Last score:{' '}
                <span className="font-semibold text-gray-800">
                  {attempts.last_correct_answers} / {attempts.last_total_questions} correct
                </span>
                {' '}
                {attempts.last_passed
                  ? <span className="text-green-600 font-semibold">✓ Passed</span>
                  : <span className="text-red-500 font-semibold">✗ Not passed</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={starting}
        className="px-8 py-3 rounded-full border-2 border-[#1a24cc] text-[#1a24cc]
                   font-semibold text-sm hover:bg-[#eef2ff] active:scale-[.98]
                   transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {starting ? 'Loading Quiz…' : 'Start Quiz →'}
      </button>
    </div>
  );
}

// ── Screen 2: Question ────────────────────────────────────────────────────────
function QuestionScreen({ questions, currentIdx, answers, onAnswer, onProceed, submitting }) {
  const question   = questions[currentIdx];
  const total      = questions.length;
  const isLast     = currentIdx === total - 1;
  const selected   = answers[question.id] ?? null;
  const canProceed = !!selected;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      <QuestionProgress current={currentIdx + 1} total={total} />

      {/* Question text */}
      <div className="pb-4 border-b border-gray-200">
        <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map(opt => (
          <OptionRow
            key={opt.id}
            option={opt}
            selected={selected === opt.id}
            onSelect={id => onAnswer(question.id, id)}
          />
        ))}
      </div>

      {/* Proceed button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onProceed}
          disabled={!canProceed || submitting}
          className="px-6 py-2.5 rounded-full bg-[#1a24cc] text-white text-sm font-semibold
                     hover:bg-[#1219a0] active:scale-[.98] transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Submitting…'
            : isLast
              ? 'Proceed and Complete Quiz →'
              : 'Proceed →'}
        </button>
      </div>
    </div>
  );
}

// ── Screen 3: Result ──────────────────────────────────────────────────────────
function ResultScreen({ result, onRetry }) {
  const { passed, correct_answers, total_questions, points_earned, updated_total_points, attempt_number } = result;

  if (passed) {
    return (
      <div className="flex flex-col items-center gap-5 py-6">
        {/* Success banner */}
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Perfect Score! 🎉</h2>
          <p className="text-gray-500 text-sm mt-1">
            {correct_answers} / {total_questions} correct
          </p>
        </div>

        {/* Points earned pop-up style */}
        <div className="bg-[#eef2ff] border border-[#1a24cc]/20 rounded-2xl px-8 py-5
                        flex flex-col items-center gap-1 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Points Earned</p>
          <p className="text-4xl font-black text-[#1a24cc]">+{points_earned}</p>
          <p className="text-xs text-gray-400">Total: {updated_total_points} pts</p>
        </div>

        <p className="text-sm text-gray-400">Attempt #{attempt_number}</p>
      </div>
    );
  }

  // Failed
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Fail banner */}
      <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Not Quite!</h2>
        <p className="text-gray-500 text-sm mt-1">
          {correct_answers} / {total_questions} correct
        </p>
        <p className="text-[#1a24cc] text-sm font-medium mt-2">
          Try again to earn more points
        </p>
      </div>

      <button
        onClick={onRetry}
        className="px-7 py-2.5 rounded-full bg-[#1a24cc] text-white text-sm font-semibold
                   hover:bg-[#1219a0] transition-colors"
      >
        Retry Quiz
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: QuizPlayer
// ─────────────────────────────────────────────────────────────────────────────
export default function QuizPlayer({ quizId, enrollmentId, onQuizComplete }) {
  // ── State machine ────────────────────────────────────────────────────────
  const [screen,          setScreen]          = useState('intro');   // 'intro' | 'question' | 'result'
  const [quiz,            setQuiz]            = useState(null);
  const [attempts,        setAttempts]        = useState(null);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [starting,        setStarting]        = useState(false);
  const [currentIdx,      setCurrentIdx]      = useState(0);
  const [answers,         setAnswers]         = useState({});         // { question_id: option_id }
  const [submitting,      setSubmitting]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState(null);
  const [showPopup,       setShowPopup]       = useState(false);  // PointsPopup visibility

  // ── Fetch attempt history on mount ───────────────────────────────────────
  useEffect(() => {
    if (!quizId) return;
    api.get(`/quizzes/${quizId}/my-attempts`)
      .then(r => setAttempts(r.data))
      .catch(console.error)
      .finally(() => setLoadingAttempts(false));
  }, [quizId]);

  // ── Start: fetch quiz questions ───────────────────────────────────────────
  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const r = await api.get(`/quizzes/${quizId}`);
      setQuiz(r.data.quiz);
      setAnswers({});
      setCurrentIdx(0);
      setScreen('question');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load quiz.');
    } finally {
      setStarting(false);
    }
  }

  // ── Answer a question ─────────────────────────────────────────────────────
  function handleAnswer(questionId, optionId) {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }

  // ── Proceed to next question / submit on last ────────────────────────────
  async function handleProceed() {
    const questions = quiz?.questions ?? [];
    const isLast    = currentIdx === questions.length - 1;

    if (!isLast) {
      setCurrentIdx(i => i + 1);
      return;
    }

    // Submit
    setSubmitting(true);
    setError(null);
    try {
      const payload = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      }));
      const r = await api.post(`/quizzes/${quizId}/submit`, {
        enrollment_id: enrollmentId,
        answers: payload,
      });
      setResult(r.data);
      setScreen('result');
      // Refresh attempt history
      setAttempts(prev => ({
        ...prev,
        attempt_count:        (prev?.attempt_count ?? 0) + 1,
        last_passed:          r.data.passed,
        last_points_earned:   r.data.points_earned,
        last_correct_answers: r.data.correct_answers,
        last_total_questions: r.data.total_questions,
      }));
      // On pass: show PointsPopup; on fail: go straight to result
      if (r.data.passed) {
        setShowPopup(true);
      } else {
        setScreen('result');
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Close popup (pass) ───────────────────────────────────────────────────
  function handlePopupClose() {
    setShowPopup(false);
    setScreen('result');
    // Invalidate auth so profile badge re-fetches
    api.get('/auth/me').catch(() => {});
    // Notify parent that quiz is complete
    if (onQuizComplete && result) {
      onQuizComplete(result);
    }
  }

  // ── Retry ─────────────────────────────────────────────────────────────────
  function handleRetry() {
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    setQuiz(null);
    setScreen('intro');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* PointsPopup — rendered outside the card, as a fixed overlay */}
      {showPopup && result && (
        <PointsPopup
          pointsEarned={result.points_earned}
          updatedTotalPoints={result.updated_total_points}
          onClose={handlePopupClose}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm
                        rounded-xl px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {screen === 'intro' && (
        <IntroScreen
          quiz={quiz ?? { title: 'Quiz', questions: [] }}
          attempts={attempts}
          loadingAttempts={loadingAttempts}
          onStart={handleStart}
          starting={starting}
        />
      )}

      {screen === 'question' && quiz?.questions?.length > 0 && (
        <QuestionScreen
          questions={quiz.questions}
          currentIdx={currentIdx}
          answers={answers}
          onAnswer={handleAnswer}
          onProceed={handleProceed}
          submitting={submitting}
        />
      )}

      {screen === 'result' && result && (
        <ResultScreen result={result} onRetry={handleRetry} />
      )}
    </div>
    </>
  );
}
