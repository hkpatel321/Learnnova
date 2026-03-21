import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import api from '../lib/api';
import { isLoggedIn } from '../lib/auth';

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search courses..."
        className="pl-9 pr-4 py-2 text-sm rounded-lg border border-brand/30
                   text-gray-700 placeholder-gray-400 bg-white
                   focus:outline-none focus:ring-2 focus:ring-brand/40
                   w-64 transition-all"
      />
    </div>
  );
}

// ── Tag filter pill ───────────────────────────────────────────────────────────
function TagPill({ tag, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
      }`}
    >
      {tag}
    </button>
  );
}

// ── BrowseCourses ─────────────────────────────────────────────────────────────
export default function BrowseCourses() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch]     = useState('');
  const [activeTag, setActiveTag] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Fetch published courses
  useEffect(() => {
    api.get('/courses').then(r => {
      setCourses(r.data.courses ?? r.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Fetch enrollments if logged in
  useEffect(() => {
    if (!loggedIn) return;
    api.get('/enrollments/me').then(r => {
      setEnrollments(r.data.enrollments ?? r.data ?? []);
    }).catch(console.error);
  }, [loggedIn]);

  // Enrollment map for fast lookup
  const enrollmentMap = useMemo(() => {
    const m = {};
    for (const e of enrollments) m[e.course_id] = { status: e.status, completion_pct: e.completion_pct ?? 0 };
    return m;
  }, [enrollments]);

  // Collect all unique tags for filter pills
  const allTags = useMemo(() => {
    const set = new Set();
    for (const c of courses) (c.tags || []).forEach(t => set.add(t));
    return [...set].slice(0, 12);
  }, [courses]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    let list = courses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.short_desc?.toLowerCase().includes(q) ||
        c.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (activeTag) {
      list = list.filter(c => (c.tags || []).includes(activeTag));
    }
    return list;
  }, [courses, search, activeTag]);

  // Enroll handler
  const handleEnroll = useCallback(async (course) => {
    if (!loggedIn) { navigate('/login'); return; }
    try {
      await api.post(`/courses/${course.id}/enroll`);
      const res = await api.get('/enrollments/me');
      setEnrollments(res.data.enrollments ?? res.data ?? []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        // Already enrolled — just refresh enrollments list silently
        const res = await api.get('/enrollments/me');
        setEnrollments(res.data.enrollments ?? res.data ?? []);
      } else {
        alert(msg);
      }
    }
  }, [loggedIn, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar searchSlot={<SearchBar value={rawSearch} onChange={setRawSearch} />} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: "'Fraunces', serif" }}>
            Explore Courses
          </h1>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* ── Tag Filters ───────────────────────────────────────────────── */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <TagPill
              tag="All"
              active={activeTag === null}
              onClick={() => setActiveTag(null)}
            />
            {allTags.map(tag => (
              <TagPill
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              />
            ))}
          </div>
        )}

        {/* ── Course  Grid ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4
                          rounded-2xl border-2 border-dashed border-gray-200">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <div className="text-center">
              <p className="font-semibold text-gray-600">No courses found</p>
              <p className="text-sm text-gray-400 mt-1">
                {search || activeTag ? 'Try a different search or filter' : 'No published courses yet'}
              </p>
            </div>
            {(search || activeTag) && (
              <button
                onClick={() => { setRawSearch(''); setSearch(''); setActiveTag(null); }}
                className="text-brand text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCourses.map(course => {
              const enr = enrollmentMap[course.id];
              return (
                <CourseCard
                  key={course.id}
                  course={{ ...course, completion_pct: enr?.completion_pct ?? 0 }}
                  enrollmentStatus={enr?.status ?? null}
                  onEnroll={handleEnroll}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
