// ── Lesson status icon — 18×18 SVG ────────────────────────────────────────────
export default function LessonStatusIcon({ status }) {
  if (status === 'completed') {
    // Filled blue circle + white checkmark
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
           aria-label="Completed">
        <circle cx="9" cy="9" r="9" fill="#1a24cc" />
        <path d="M5.5 9.5l2.5 2.5 4.5-5"
              stroke="white" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'in_progress') {
    // Half-filled blue circle
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
           aria-label="In progress">
        {/* Right half filled */}
        <path d="M9 0a9 9 0 0 1 0 18V0z" fill="#1a24cc" />
        {/* Left half outline */}
        <path d="M9 18a9 9 0 0 1 0-18v18z" fill="#e5e7eb" />
        <circle cx="9" cy="9" r="8.25" stroke="#1a24cc" strokeWidth="1.5" />
      </svg>
    );
  }

  // not_started: empty circle, gray border
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
         aria-label="Not started">
      <circle cx="9" cy="9" r="8.25"
              stroke="#d1d5db" strokeWidth="1.5" fill="white" />
    </svg>
  );
}
