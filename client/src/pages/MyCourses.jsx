import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import api from '../lib/api';
import { isLoggedIn, getToken } from '../lib/auth';

// ── Badge tiers ──────────────────────────────────────────────────────────────
const BADGES = [
  { name: 'Newbie',     threshold: 20  },
  { name: 'Explorer',   threshold: 40  },
  { name: 'Achiever',   threshold: 60  },
  { name: 'Specialist', threshold: 80  },
  { name: 'Expert',     threshold: 100 },
  { name: 'Master',     threshold: 120 },
];

function getCurrentBadge(points) {
  let badge = BADGES[0];
  for (const b of BADGES) {
    if (points >= b.threshold) badge = b;
    else break;
  }
  return badge;
}

function getNextThreshold(points) {
  for (const b of BADGES) {
    if (points < b.threshold) return b.threshold;
  }
  return BADGES[BADGES.length - 1].threshold;
}

// ── SVG Donut Progress ───────────────────────────────────────────────────────
function DonutProgress({ points }) {
  const size = 160;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const currentBadge = getCurrentBadge(points);
  const prevThreshold = (() => {
    const idx = BADGES.findIndex(b => b.name === currentBadge.name);
    return idx > 0 ? BADGES[idx - 1].threshold : 0;
  })();
  const nextThreshold = getNextThreshold(points);
  const isMaxed = points >= BADGES[BADGES.length - 1].threshold;

  const range = nextThreshold - prevThreshold;
  const progress = isMaxed ? 1 : Math.min((points - prevThreshold) / range, 1);
  const dashOffset = circ * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#e0e7ff"
            strokeWidth={stroke}
          />
          {/* Fill */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#1a24cc"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#1a24cc]">{points}</span>
          <span className="text-[11px] text-gray-500 font-medium -mt-0.5">pts</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-bold text-[#1a24cc] tracking-wide">
        {currentBadge.name}
      </span>
      {!isMaxed && (
        <span className="text-xs text-gray-400 mt-0.5">
          {nextThreshold - points} pts to next badge
        </span>
      )}
    </div>
  );
}

// ── Badge List ────────────────────────────────────────────────────────────────
function BadgeList({ points }) {
  const currentBadge = getCurrentBadge(points);

  return (
    <div className="mt-5 space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        Badges
      </p>
      {BADGES.map((b) => {
        const earned   = points >= b.threshold;
        const isCurrent = b.name === currentBadge.name;
        return (
          <div
            key={b.name}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm
              ${isCurrent
                ? 'bg-[#1a24cc] text-white font-semibold'
                : earned
                  ? 'text-[#1a24cc] font-medium'
                  : 'text-gray-400'
              }`}
          >
            <span className="flex items-center gap-1.5">
              {earned && (
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {b.name}
            </span>
            <span className={`text-xs ${isCurrent ? 'text-white/80' : 'text-gray-400'}`}>
              {b.threshold} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── My Profile Panel ──────────────────────────────────────────────────────────
function ProfilePanel({ user, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse space-y-4">
        <div className="h-5 w-28 bg-gray-200 rounded" />
        <div className="flex justify-center">
          <div className="w-40 h-40 rounded-full bg-gray-200" />
        </div>
        <div className="space-y-2 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <p className="text-gray-500 text-sm mb-3">Sign in to view your profile</p>
        <Link to="/login" className="btn-primary text-sm px-5 py-2">Sign In</Link>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-[#1a24cc] flex items-center justify-center
                        text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
      </div>

      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">
        My Profile
      </h2>

      {/* Donut widget */}
      <DonutProgress points={user.total_points ?? 0} />

      {/* Badge list */}
      <BadgeList points={user.total_points ?? 0} />
    </div>
  );
}

// ── Inline Search bar (passed as searchSlot) ─────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search course"
        className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[#1a24cc]/30
                   text-gray-700 placeholder-gray-400 bg-white
                   focus:outline-none focus:ring-2 focus:ring-[#1a24cc]/40
                   w-56 transition-all"
      />
    </div>
  );
}

// ── Skeleton grid ───────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

// ── MyCourses ─────────────────────────────────────────────────────────────────
export default function MyCourses() {
  const navigate    = useNavigate();
  const loggedIn    = isLoggedIn();

  const [courses,     setCourses]     = useState([]);
  const [enrollments, setEnrollments] = useState([]);   // [{course_id, status, completion_pct}]
  const [user,        setUser]        = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Local search (debounced 300 ms)
  const [rawSearch,  setRawSearch]  = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // ── Fetch courses (public) ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/courses').then(r => {
      setCourses(r.data.courses ?? r.data);
    }).catch(console.error)
      .finally(() => setLoadingCourses(false));
  }, []);

  // ── Fetch profile + enrollments (parallel, only if logged in) ─────────────
  useEffect(() => {
    if (!loggedIn) { setLoadingProfile(false); return; }
    Promise.all([
      api.get('/auth/me'),
      api.get('/enrollments/me'),
    ]).then(([meRes, enrRes]) => {
      setUser(meRes.data.user ?? meRes.data);
      setEnrollments(enrRes.data.enrollments ?? enrRes.data ?? []);
    }).catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [loggedIn]);

  // ── Enrollment map ─────────────────────────────────────────────────────────
  const enrollmentMap = useMemo(() => {
    const m = {};
    for (const e of enrollments) {
      m[e.course_id] = { status: e.status, completion_pct: e.completion_pct ?? 0 };
    }
    return m;
  }, [enrollments]);

  // ── Filter by search ───────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.short_desc?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [courses, search]);

  // Show only enrolled courses (my-courses context)
  const displayCourses = useMemo(() => {
    if (!loggedIn) return filteredCourses;
    // My courses = enrolled ones
    return filteredCourses.filter(c => enrollmentMap[c.id]);
  }, [filteredCourses, enrollmentMap, loggedIn]);

  // ── Enroll handler ─────────────────────────────────────────────────────────
  const handleEnroll = useCallback(async (course) => {
    if (!loggedIn) { navigate('/login'); return; }
    try {
      await api.post(`/courses/${course.id}/enroll`);
      const res = await api.get('/enrollments/me');
      setEnrollments(res.data.enrollments ?? res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [loggedIn, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <Navbar searchSlot={<SearchBar value={rawSearch} onChange={setRawSearch} />} />

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <main className="container-page py-7">
        <div className="flex flex-col lg:flex-row gap-7">

          {/* ── LEFT: Course Grid (65%) ───────────────────────────────────── */}
          <section className="flex-1 min-w-0">
            {/* Heading + search hint */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-gray-900">
                My Courses
              </h1>
              {!loadingCourses && (
                <span className="text-sm text-gray-400">
                  {displayCourses.length} course{displayCourses.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loadingCourses ? (
              <SkeletonGrid />
            ) : displayCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4
                              rounded-2xl border-2 border-dashed border-gray-200">
                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052
                           0-2.062.18-3 .512v14.25A8.987 8.987 0 016
                           18c2.305 0 4.408.867 6 2.292m0-14.25a8.966
                           8.966 0 016-2.292c1.052 0 2.062.18 3
                           .512v14.25A8.987 8.987 0 0018 18a8.967
                           8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <div className="text-center">
                  <p className="font-semibold text-gray-600">No courses yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {loggedIn
                      ? 'Start learning by browsing the catalog'
                      : 'Sign in and enroll to see your courses here'}
                  </p>
                </div>
                <Link to="/courses" className="btn-primary text-sm px-5 py-2">
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayCourses.map(course => {
                  const enr = enrollmentMap[course.id];
                  return (
                    <CourseCard
                      key={course.id}
                      course={{
                        ...course,
                        completion_pct: enr?.completion_pct ?? 0,
                      }}
                      enrollmentStatus={enr?.status ?? null}
                      onEnroll={handleEnroll}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* ── RIGHT: My Profile Panel (35%, sticky) ─────────────────────── */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              <ProfilePanel user={user} loading={loadingProfile} />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
