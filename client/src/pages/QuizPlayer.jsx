import { useState, useEffect } from 'react'
import api from '../lib/api'

const SCREEN = {
  INTRO: 'intro',
  QUESTION: 'question',
  RESULT: 'result',
}

// ─── Radio Option Card ────────────────────────────────────────────────────────
function OptionCard({ option, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(option.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        border: selected ? '1.5px solid #1a24cc' : '1.5px solid #e5e7eb',
        borderLeft: selected ? '4px solid #1a24cc' : '1.5px solid #e5e7eb',
        borderRadius: '10px',
        background: selected ? '#eef2ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: '10px',
        userSelect: 'none',
      }}
    >
      {/* Radio circle */}
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: selected ? '6px solid #1a24cc' : '2px solid #d1d5db',
        background: selected ? '#1a24cc' : '#fff',
        flexShrink: 0,
        transition: 'all 0.15s',
        boxSizing: 'border-box',
      }} />
      <span style={{
        fontSize: '15px',
        color: selected ? '#1a24cc' : '#1f2937',
        fontWeight: selected ? '500' : '400',
        lineHeight: '1.4',
      }}>
        {option.option_text}
      </span>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function QuizProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a24cc' }}>
          Question {current} of {total}
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          {pct}% done
        </span>
      </div>
      <div style={{
        height: '4px',
        background: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: '#1a24cc',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Main QuizPlayer ──────────────────────────────────────────────────────────
export default function QuizPlayer({ quizId, enrollmentId, onQuizComplete, onNextContent }) {
  const [screen, setScreen]           = useState(SCREEN.INTRO)
  const [quizMeta, setQuizMeta]       = useState(null)   // from /my-attempts
  const [quizData, setQuizData]       = useState(null)   // questions + options
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [answers, setAnswers]         = useState({})     // { question_id: selected_option_id }
  const [result, setResult]           = useState(null)   // submit response
  const [loading, setLoading]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)

  // Fetch attempt history on mount
  useEffect(() => {
    if (!quizId) return
    api.get(`/quizzes/${quizId}/my-attempts`)
      .then(r => setQuizMeta(r.data))
      .catch(() => setQuizMeta({ attempt_count: 0 }))
  }, [quizId])

  const currentQuestion = quizData?.questions?.[currentIdx]
  const totalQuestions  = quizData?.questions?.length ?? 0
  const isLastQuestion  = currentIdx === totalQuestions - 1
  const selectedOption  = answers[currentQuestion?.id]

  // ── Start quiz: fetch questions ──────────────────────────────────────────
  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/quizzes/${quizId}`)
      setQuizData(data)
      setCurrentIdx(0)
      setAnswers({})
      setScreen(SCREEN.QUESTION)
    } catch {
      setError('Failed to load quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Select an option ─────────────────────────────────────────────────────
  function handleSelect(optionId) {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }))
  }

  // ── Proceed / Submit ─────────────────────────────────────────────────────
  async function handleProceed() {
    if (!selectedOption) return

    if (!isLastQuestion) {
      setCurrentIdx(i => i + 1)
      return
    }

    // Last question → submit
    setSubmitting(true)
    setError(null)
    try {
      const answersArray = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      }))

      const { data } = await api.post(`/quizzes/${quizId}/submit`, {
        enrollment_id: enrollmentId,
        answers: answersArray,
      })

      setResult(data)
      setScreen(SCREEN.RESULT)

      // Refresh attempt meta
      const meta = await api.get(`/quizzes/${quizId}/my-attempts`)
      setQuizMeta(meta.data)
    } catch {
      setError('Failed to submit quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Retry ────────────────────────────────────────────────────────────────
  function handleRetry() {
    setAnswers({})
    setCurrentIdx(0)
    setResult(null)
    setScreen(SCREEN.INTRO)
  }

  // ────────────────────────────────────────────────────────────────────────
  // SCREEN 1 — INTRO
  // ────────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.INTRO) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Centered intro card */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}>
          <div style={{
            background: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: '16px',
            padding: '40px 48px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'left',
          }}>
            {/* Quiz icon */}
            <div style={{
              width: '48px',
              height: '48px',
              background: '#eef2ff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6M9 16h4M7 4H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V8l-5-4H7z"
                  stroke="#1a24cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 4v4h5" stroke="#1a24cc" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '16px',
            }}>
              {quizData?.title ?? 'Quiz'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%', background: '#1a24cc', flexShrink: 0,
                }} />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Total Questions: <strong>{quizMeta?.total_questions ?? '—'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%', background: '#1a24cc', flexShrink: 0,
                }} />
                <span style={{ fontSize: '14px', color: '#374151' }}>Multiple Attempts</span>
              </div>
              {quizMeta?.attempt_count > 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  background: '#f0f4ff',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                }}>
                  <span style={{ fontSize: '13px', color: '#4338ca' }}>
                    Previous attempts: <strong>{quizMeta.attempt_count}</strong>
                    {quizMeta.last_passed != null && (
                      <span style={{ marginLeft: '8px', color: quizMeta.last_passed ? '#16a34a' : '#dc2626' }}>
                        · Last: {quizMeta.last_passed ? `Passed (+${quizMeta.last_points_earned} pts)` : 'Failed'}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: '8px',
                marginBottom: '16px', fontSize: '13px', color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#e5e7eb' : '#1a24cc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Loading...' : 'Start Quiz →'}
            </button>
          </div>
        </div>

        {/* Next Content button */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '1px solid #e5e7eb',
        }}>
          <button
            onClick={onNextContent}
            style={{
              padding: '10px 22px',
              background: '#fff',
              color: '#6b7280',
              border: '1.5px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Next Content →
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // SCREEN 2 — QUESTION
  // ────────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.QUESTION && currentQuestion) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

          {/* Progress */}
          <QuizProgressBar current={currentIdx + 1} total={totalQuestions} />

          {/* Question text */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#111827',
              lineHeight: '1.5',
              paddingBottom: '14px',
              borderBottom: '2px solid #e5e7eb',
            }}>
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Options */}
          <div>
            {currentQuestion.options
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(opt => (
                <OptionCard
                  key={opt.id}
                  option={opt}
                  selected={selectedOption === opt.id}
                  onSelect={handleSelect}
                />
              ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '8px',
              marginTop: '16px', fontSize: '13px', color: '#dc2626',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '16px 40px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          background: '#fff',
        }}>
          {/* Back to prev question */}
          {currentIdx > 0 && (
            <button
              onClick={() => setCurrentIdx(i => i - 1)}
              style={{
                padding: '10px 20px',
                background: '#fff',
                color: '#1a24cc',
                border: '1.5px solid #1a24cc',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}

          <button
            onClick={handleProceed}
            disabled={!selectedOption || submitting}
            style={{
              padding: '11px 32px',
              background: !selectedOption || submitting ? '#e5e7eb' : '#1a24cc',
              color: !selectedOption || submitting ? '#9ca3af' : '#fff',
              border: 'none',
              borderRadius: '30px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: !selectedOption || submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {submitting
              ? 'Submitting...'
              : isLastQuestion
                ? 'Proceed and Complete Quiz →'
                : 'Proceed →'}
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // SCREEN 3 — RESULT
  // ────────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.RESULT && result) {
    if (result.passed) {
      // Passed → parent handles PointsPopup via onQuizComplete
      onQuizComplete?.(result)
      return null
    }

    // Failed
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}>
          <div style={{
            background: '#fff',
            border: '1.5px solid #e5e7eb',
            borderRadius: '16px',
            padding: '40px 48px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
          }}>
            {/* Fail icon */}
            <div style={{
              width: '56px',
              height: '56px',
              background: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Not quite there!
            </h3>

            {/* Score */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '4px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px 24px',
              margin: '16px 0',
            }}>
              <span style={{ fontSize: '36px', fontWeight: '700', color: '#1a24cc' }}>
                {result.correct_answers}
              </span>
              <span style={{ fontSize: '18px', color: '#9ca3af' }}>
                / {result.total_questions}
              </span>
              <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '6px' }}>
                correct
              </span>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px' }}>
              Try again to earn more points. Points reduce with each attempt so try your best!
            </p>

            <button
              onClick={handleRetry}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a24cc',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Retry Quiz →
            </button>
          </div>
        </div>

        {/* Next Content */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '1px solid #e5e7eb',
        }}>
          <button
            onClick={onNextContent}
            style={{
              padding: '10px 22px',
              background: '#fff',
              color: '#6b7280',
              border: '1.5px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Next Content →
          </button>
        </div>
      </div>
    )
  }

  return null
}