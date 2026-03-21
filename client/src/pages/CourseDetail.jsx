import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LessonStatusIcon from '../components/LessonStatusIcon';
import api from '../lib/api';
import { isLoggedIn } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

// ── Helpers ──────────────────────────────────────────────────────────────────
const TAG_GRADIENTS = {
  python:  'from-indigo-500 to-indigo-700',
  react:   'from-sky-400   to-sky-600',
  ml:      'from-green-500 to-green-700',
  design:  'from-purple-500 to-purple-700',
};
function coverGradient(tags = []) {
  for (const tag of tags) {
    if (TAG_GRADIENTS[tag.toLowerCase()]) return TAG_GRADIENTS[tag.toLowerCase()];
  }
  return 'from-blue-600 to-[#1219a0]';
}

// lesson type icon (small)
function LessonTypeIcon({ type }) {
  switch (type) {
    case 'video':
      return (
        <svg className="w-3.5 h-3.5 text-[#1a24cc]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
      );
    case 'quiz':
      return (
        <svg className="w-3.5 h-3.5 text-[#1a24cc]" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1
                   0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
        </svg>
      );
    default: // document / image
      return (
        <svg className="w-3.5 h-3.5 text-[#1a24cc]" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                   a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

// ── Progress stats card (right side) ─────────────────────────────────────────
function ProgressCard({ course, enrollment, lessons, progressMap, onEnroll, enrolling }) {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const total     = lessons.length;
  const completed = lessons.filter(l => progressMap[l.id] === 'completed').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const incomplete = total - completed;

  const enrolled = !!enrollment;
  const status   = enrollment?.status ?? null;

  function handleCTA() {
    if (!loggedIn) { navigate('/login'); return; }
    if (!enrolled) { onEnroll(); return; }
    // Find next non-completed lesson
    const next = lessons.find(l => progressMap[l.id] !== 'completed') ?? lessons[0];
    if (next) {
      if (next.item_type === 'quiz_standalone') {
        navigate(`/learn/${course.id}/quiz/${next.id}`);
      } else {
        navigate(`/learn/${course.id}/${next.id}`);
      }
    }
  }

  const ctaLabel = !loggedIn
    ? 'Sign In to Enroll'
    : !enrolled
      ? (course.access_rule === 'payment'
          ? `Buy — ₹${Number(course.price).toLocaleString('en-IN')}`
          : 'Enroll Now')
      : status === 'completed'
        ? 'Review Course'
        : status === 'in_progress'
          ? 'Continue Learning'
          : 'Start Course';

  return (
    <div className="bg-white rounded-2xl border-2 border-[#1a24cc]/20 shadow-md p-5 flex flex-col gap-4">
      {/* Progress label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {enrolled ? `${pct}% Completed` : 'Not enrolled'}
        </span>
        {enrolled && pct === 100 && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Done</span>
        )}
      </div>

      {/* Progress bar */}
      {enrolled && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="flex flex-col items-center px-2">
          <span className="text-lg font-bold text-gray-800">{total}</span>
          <span className="text-[11px] text-gray-400 text-center leading-tight">
            Content{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-col items-center px-2">
          <span className="text-lg font-bold text-[#1a24cc]">{completed}</span>
          <span className="text-[11px] text-gray-400 text-center leading-tight">
            Completed
          </span>
        </div>
        <div className="flex flex-col items-center px-2">
          <span className="text-lg font-bold text-gray-400">{incomplete}</span>
          <span className="text-[11px] text-gray-400 text-center leading-tight">
            Remaining
          </span>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={handleCTA}
        disabled={enrolling}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#1a24cc] text-white
                   hover:bg-[#1219a0] active:scale-[.98] transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {enrolling ? 'Enrolling…' : ctaLabel}
      </button>
    </div>
  );
}

// ── Lesson row ────────────────────────────────────────────────────────────────
function LessonRow({ lesson, index, courseId, status, enrolled, onEnrollThenGo }) {
  const navigate = useNavigate();

  function handleClick() {
    if (!enrolled) {
      onEnrollThenGo(lesson);
    } else {
      if (lesson.item_type === 'quiz_standalone') {
        navigate(`/learn/${courseId}/quiz/${lesson.id}`);
      } else {
        navigate(`/learn/${courseId}/${lesson.id}`);
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                 hover:bg-[#eef2ff] group transition-colors text-left"
    >
      {/* Index prefix */}
      <span className="text-sm font-bold text-[#1a24cc] w-6 flex-shrink-0 text-right">
        {String(index).padStart(2, '0')}
      </span>

      {/* Type icon */}
      <span className="flex-shrink-0">
        <LessonTypeIcon type={lesson.lesson_type} />
      </span>

      {/* Title */}
      <span className="flex-1 text-sm text-[#1a24cc] group-hover:underline font-medium truncate">
        {lesson.title}
      </span>

      {/* Duration (if available) */}
      {lesson.duration_mins && (
        <span className="text-xs text-gray-400 flex-shrink-0 mr-2">
          {lesson.duration_mins}m
        </span>
      )}

      {/* Status icon */}
      <span className="flex-shrink-0">
        <LessonStatusIcon status={status ?? 'not_started'} />
      </span>
    </button>
  );
}

// ── Tab pill ──────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border
        ${active
          ? 'bg-[#1a24cc] text-white border-[#1a24cc]'
          : 'bg-white text-[#1a24cc] border-[#1a24cc]/40 hover:border-[#1a24cc]'
        }`}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RATINGS & REVIEWS
// ══════════════════════════════════════════════════════════════════════════════

// ── SVG Star ──────────────────────────────────────────────────────────────────
function Star({ filled, half, size = 20, onClick, onMouseEnter, onMouseLeave }) {
  const color = filled || half ? '#1a24cc' : '#e2e8f0';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: onClick ? 'pointer' : 'default', flexShrink: 0 }}
    >
      {half ? (
        // Half-filled: left half blue, right half empty
        <>
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor={color} />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill="url(#half)" stroke={color}
          />
        </>
      ) : (
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      )}
    </svg>
  );
}

// ── Static star row ───────────────────────────────────────────────────────────
function StarRow({ rating, size = 18 }) {
  const r = Number(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          filled={r >= n}
          half={r >= n - 0.5 && r < n}
        />
      ))}
    </div>
  );
}

// ── Clickable star selector (for form) ────────────────────────────────────────
function StarSelector({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={22}
          filled={display >= n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        />
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500">{value} / 5</span>
      )}
    </div>
  );
}

// ── User initials avatar ──────────────────────────────────────────────────────
function ReviewAvatar({ name, url, size = 36 }) {
  const initials = (name ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) {
    return (
      <img src={url} alt={name}
           style={{ width: size, height: size }}
           className="rounded-full object-cover flex-shrink-0" />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-[#1a24cc] text-white font-bold
                 flex items-center justify-center flex-shrink-0 select-none"
    >
      {initials}
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  return (
    <div className="flex gap-3 py-4">
      <ReviewAvatar name={review.user_name} url={review.user_avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-800">
            {review.user_name ?? 'User'}
          </span>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
        <StarRow rating={review.rating} size={14} />
        {review.review_text && (
          <div className="mt-2 text-sm text-gray-600 leading-relaxed
                          bg-white border border-orange-300 rounded-xl px-4 py-3
                          shadow-sm">
            {review.review_text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Review inline form ────────────────────────────────────────────────────
function AddReviewForm({ courseId, user, onSuccess, onCancel }) {
  const [rating,  setRating]  = useState(0);
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) { setErr('Please select a star rating.'); return; }
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post(`/courses/${courseId}/reviews`, {
        rating,
        review_text: text.trim() || null,
      });
      onSuccess(res.data.review);
    } catch (error) {
      const msg = error.response?.data?.error ?? 'Failed to submit review.';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}
          className="bg-white border-2 border-[#1a24cc]/20 rounded-2xl p-5
                     shadow-sm flex gap-4 mb-5">
      {/* Avatar */}
      <ReviewAvatar name={user?.name} url={user?.avatar_url} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 mb-2">
          {user?.name ?? 'You'}
        </p>
        {/* Star selector */}
        <div className="mb-3">
          <StarSelector value={rating} onChange={setRating} />
        </div>
        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your review…"
          rows={3}
          className="w-full text-sm text-gray-700 placeholder-gray-400
                     border border-orange-300 rounded-xl px-4 py-3 resize-none
                     focus:outline-none focus:ring-2 focus:ring-[#1a24cc]/30
                     transition-all"
        />
        {/* Error */}
        {err && (
          <p className="mt-1 text-xs text-red-500">{err}</p>
        )}
        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-[#1a24cc] text-white text-sm
                       font-semibold hover:bg-[#1219a0] transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting…' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-xl border border-[#1a24cc]/40 text-[#1a24cc]
                       text-sm font-semibold hover:border-[#1a24cc] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Full Reviews Tab ──────────────────────────────────────────────────────────
function ReviewsTab({ courseId, enrolled, user }) {
  const [reviews,    setReviews]    = useState([]);
  const [summary,    setSummary]    = useState({ avg_rating: 0, review_count: 0 });
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const formRef = useRef(null);

  const loggedIn = isLoggedIn();
  const canReview = loggedIn && enrolled && !hasReviewed;

  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${courseId}/reviews`)
      .then(r => {
        setReviews(r.data.reviews ?? []);
        setSummary(r.data.summary ?? { avg_rating: 0, review_count: 0 });
        // Check if current user already reviewed
        if (user && r.data.reviews) {
          setHasReviewed(r.data.reviews.some(rv => rv.user_id === user.id));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId, user]);

  function handleAddClick() {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleSuccess(newReview) {
    // Merge user info into the returned review
    const enriched = {
      ...newReview,
      user_name:       user?.name,
      user_avatar_url: user?.avatar_url ?? null,
      user_id:         user?.id,
    };
    setReviews(prev => [enriched, ...prev]);
    setSummary(prev => ({
      avg_rating: ((Number(prev.avg_rating) * prev.review_count + newReview.rating)
                    / (prev.review_count + 1)).toFixed(1),
      review_count: prev.review_count + 1,
    }));
    setHasReviewed(true);
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-12 w-32 bg-gray-200 rounded mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 py-4 border-t border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Summary header ── */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Big rating number */}
          <div className="flex flex-col items-center">
            <span className="text-5xl font-black text-gray-900 leading-none">
              {Number(summary.avg_rating).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">
              {summary.review_count} review{summary.review_count !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Stars */}
          <div className="flex flex-col gap-1">
            <StarRow rating={summary.avg_rating} size={22} />
            <span className="text-xs text-gray-400">
              Based on {summary.review_count} rating{summary.review_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Add Review button */}
        {canReview && !showForm && (
          <button
            onClick={handleAddClick}
            className="px-5 py-2 rounded-full border border-[#1a24cc] text-[#1a24cc]
                       text-sm font-semibold hover:bg-[#eef2ff] transition-colors flex-shrink-0"
          >
            + Add Review
          </button>
        )}
        {hasReviewed && (
          <span className="text-xs text-green-600 font-medium flex-shrink-0">
            ✓ You reviewed this course
          </span>
        )}
      </div>

      {/* ── Inline form ── */}
      <div ref={formRef}>
        {showForm && (
          <div className="px-5 pt-5">
            <AddReviewForm
              courseId={courseId}
              user={user}
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </div>

      {/* ── Review list ── */}
      <div className="divide-y divide-gray-100 px-5">
        {reviews.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563
                       0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204
                       3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0
                       01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982
                       20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0
                       00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563
                       0 00.475-.345L11.48 3.5z" />
            </svg>
            <p className="text-gray-400 text-sm">No reviews yet. Be the first!</p>
          </div>
        ) : (
          reviews.map(rv => <ReviewCard key={rv.id} review={rv} />)
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      {/* Cover */}
      <div className="h-64 bg-gray-200 rounded-none" />
      <div className="container-page py-6 space-y-4">
        <div className="h-7 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-100 rounded" />
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CourseDetail ──────────────────────────────────────────────────────────────
export default function CourseDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const loggedIn  = isLoggedIn();
  const { user }   = useAuth();

  const [course,      setCourse]      = useState(null);
  const [syllabusItems, setSyllabusItems] = useState([]);
  const [enrollment,  setEnrollment]  = useState(null);  // from /api/courses/:id
  const [progressMap, setProgressMap] = useState({});    // itemId → status string
  const [loading,     setLoading]     = useState(true);
  const [enrolling,   setEnrolling]   = useState(false);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [search,      setSearch]      = useState('');
  const [error,       setError]       = useState(null);

  // ── Fetch course detail ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    api.get(`/courses/${id}`)
      .then(r => {
        const { course, lessons, quizzes, enrollment, lesson_progress } = r.data;
        setCourse(course);
        
        const sortedLessons = [...(lessons ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(l => ({ ...l, item_type: 'lesson' }));
        const standaloneQuizzes = (quizzes ?? [])
          .filter(q => !q.lesson_id)
          .map(q => ({ ...q, item_type: 'quiz_standalone' }));
          
        setSyllabusItems([...sortedLessons, ...standaloneQuizzes]);

        setEnrollment(enrollment ?? null);

        // Build map: lessonId → 'completed' | 'in_progress' | 'not_started'
        const map = {};
        for (const lp of (lesson_progress ?? [])) {
          map[lp.lesson_id] = lp.is_completed ? 'completed' : 'in_progress';
        }
        setProgressMap(map);
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Failed to load course.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Enroll ────────────────────────────────────────────────────────────────
  const handleEnroll = useCallback(async (thenNavigateToLesson = null) => {
    if (!loggedIn) { navigate('/login'); return; }
    if (enrolling) return;
    setEnrolling(true);
    try {
      const res = await api.post(`/courses/${id}/enroll`);
      setEnrollment(res.data.enrollment);
      if (thenNavigateToLesson) {
        navigate(`/learn/${id}/${thenNavigateToLesson.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Enrollment failed.';
      alert(msg);
    } finally {
      setEnrolling(false);
    }
  }, [id, loggedIn, navigate, enrolling]);

  // Enroll then go to a lesson (used from lesson row click when unenrolled)
  const handleEnrollThenGo = useCallback((lesson) => {
    if (!loggedIn) { navigate('/login'); return; }
    handleEnroll(lesson);
  }, [handleEnroll, loggedIn, navigate]);

  // ── Filtered items (search) ─────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!search.trim()) return syllabusItems;
    const q = search.toLowerCase();
    return syllabusItems.filter(l =>
      l.title.toLowerCase().includes(q) ||
      (l.lesson_type && l.lesson_type.toLowerCase().includes(q))
    );
  }, [syllabusItems, search]);

  // ── Cover gradient ────────────────────────────────────────────────────────
  const gradient = useMemo(() => coverGradient(course?.tags ?? []), [course]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Skeleton />
    </div>
  );

  if (error || !course) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container-page pt-20 text-center">
        <p className="text-gray-500 text-lg">{error ?? 'Course not found.'}</p>
        <Link to="/courses" className="mt-4 btn-primary inline-block">Back to Catalog</Link>
      </div>
    </div>
  );

  const enrolled = !!enrollment;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ══ HERO BANNER ════════════════════════════════════════════════════ */}
      <div className="relative w-full h-64 sm:h-72 overflow-hidden">
        {/* Background */}
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Bottom-left text overlay */}
        <div className="absolute bottom-0 left-0 right-0 container-page pb-6">
          {/* Tags */}
          {course.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {course.tags.slice(0, 3).map(t => (
                <span key={t}
                  className="bg-[#1a24cc] text-white text-[10px] font-bold
                             uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight
                         drop-shadow max-w-2xl">
            {course.title}
          </h1>
          {course.short_desc && (
            <p className="mt-1.5 text-sm text-white/80 max-w-xl line-clamp-2">
              {course.short_desc}
            </p>
          )}
        </div>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════ */}
      <div className="container-page py-7">
        <div className="flex flex-col lg:flex-row gap-7">

          {/* ── LEFT: Tabs + lesson list ────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Tab pills + search */}
            <div className="flex flex-col sm:flex-row sm:items-center
                            justify-between gap-3 mb-5">
              {/* Pills */}
              <div className="flex gap-2">
                <Tab active={activeTab === 'overview'}
                     onClick={() => setActiveTab('overview')}>
                  Course Overview
                </Tab>
                <Tab active={activeTab === 'reviews'}
                     onClick={() => setActiveTab('reviews')}>
                  Ratings &amp; Reviews
                </Tab>
              </div>

              {/* Content search (visible on overview tab) */}
              {activeTab === 'overview' && (
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                                  text-gray-400 pointer-events-none"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search content…"
                    className="pl-9 pr-4 py-2 text-sm border border-[#1a24cc]/25 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#1a24cc]/30
                               bg-white text-gray-700 placeholder-gray-400 w-48"
                  />
                </div>
              )}
            </div>

            {/* ── Tab 1: Course Overview ──────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-dashed border-gray-200
                                flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {filteredItems.length}{' '}
                    Content{filteredItems.length !== 1 ? 's' : ''}
                  </span>
                  {!enrolled && (
                    <span className="text-xs text-gray-400 italic">
                      Click an item to enroll &amp; start
                    </span>
                  )}
                </div>

                {/* Lesson rows */}
                <div className="divide-y divide-dashed divide-gray-100">
                  {filteredItems.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No contents match "{search}"
                    </p>
                  ) : (
                    filteredItems.map((item, i) => (
                      <div key={`${item.item_type}-${item.id}`} className="px-1 relative">
                        {item.item_type === 'quiz_standalone' && (
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand rounded-full pointer-events-none" />
                        )}
                        <LessonRow
                          lesson={{
                            ...item,
                            lesson_type: item.item_type === 'quiz_standalone' ? 'quiz' : item.lesson_type
                          }}
                          index={i + 1}
                          courseId={id}
                          status={progressMap[item.id] ?? 'not_started'}
                          enrolled={enrolled}
                          onEnrollThenGo={handleEnrollThenGo}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Tab 2: Ratings & Reviews ─────────────────────────── */}
            {activeTab === 'reviews' && (
              <ReviewsTab
                courseId={id}
                enrolled={enrolled}
                user={user}
              />
            )}
          </div>

          {/* ── RIGHT: Progress stats card (sticky) ───────────────────── */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              {/* Course description card */}
              {course.description && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5
                                shadow-sm mb-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-2">About this course</h2>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-6">
                    {course.description}
                  </p>
                </div>
              )}

              {/* Stats + CTA */}
              <ProgressCard
                course={course}
                enrollment={enrollment}
                lessons={syllabusItems}
                progressMap={progressMap}
                onEnroll={() => handleEnroll(null)}
                enrolling={enrolling}
              />

              {/* Instructor */}
              {course.instructor_name && (
                <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-4
                                shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a24cc]/10 flex items-center
                                  justify-center text-[#1a24cc] font-bold text-sm flex-shrink-0">
                    {course.instructor_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Instructor</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {course.instructor_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
