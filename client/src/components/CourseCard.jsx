import { Link } from 'react-router-dom';

// ── Tag → gradient fallback for cover images ──────────────────────────────────
const TAG_GRADIENTS = {
  python:  'from-indigo-500 to-indigo-700',
  react:   'from-sky-400   to-sky-600',
  ml:      'from-green-500 to-green-700',
  design:  'from-purple-500 to-purple-700',
};

function coverGradient(tags = []) {
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (TAG_GRADIENTS[key]) return TAG_GRADIENTS[key];
  }
  return 'from-blue-500 to-[#1219a0]'; // default brand gradient
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── CTA button label + style ───────────────────────────────────────────────────
function ctaProps(status, accessRule, price) {
  if (!status || status === 'none') {
    if (accessRule === 'payment')
      return {
        label: `Buy Course — ₹${Number(price).toLocaleString('en-IN')}`,
        className: 'btn-primary w-full',
      };
    return { label: 'Join Course', className: 'btn-secondary w-full' };
  }
  if (status === 'not_started') return { label: 'Start',    className: 'btn-primary w-full' };
  if (status === 'in_progress') return { label: 'Continue', className: 'btn-primary w-full' };
  if (status === 'completed')   return { label: 'Review',   className: 'btn-secondary w-full' };
  return { label: 'Open', className: 'btn-primary w-full' };
}

// ── CourseCard ─────────────────────────────────────────────────────────────────
export default function CourseCard({ course, enrollmentStatus, onEnroll }) {
  const {
    id, title, short_desc, cover_image_url, tags = [],
    access_rule, price, avg_rating, review_count,
  } = course;

  const status = enrollmentStatus ?? null;
  const enrolled = status && status !== 'none';
  const { label, className } = ctaProps(status, access_rule, price);
  const completionPct = course.completion_pct ? Number(course.completion_pct) : 0;

  function handleCTA(e) {
    e.preventDefault();
    if (!enrolled && onEnroll) onEnroll(course);
  }

  return (
    <Link
      to={`/courses/${id}`}
      className="block group bg-white rounded-xl border border-gray-200
                 hover:border-brand transition-all duration-200 overflow-hidden
                 shadow-sm hover:shadow-md"
    >
      {/* ── Cover ────────────────────────────────────────────────────────── */}
      <div className="relative h-44 overflow-hidden">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105
                       transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${coverGradient(tags)}`} />
        )}

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {access_rule === 'payment' && (
            <span className="bg-amber-400 text-amber-900 text-[10px] font-bold
                             px-2 py-0.5 rounded-full uppercase tracking-wide">
              Paid
            </span>
          )}
          {status === 'completed' && (
            <span className="bg-green-500 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full uppercase tracking-wide
                             flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M5 13l4 4L19 7" />
              </svg>
              Done
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-2">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full
                           bg-brand-light text-brand uppercase tracking-wide"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug
                       line-clamp-2 group-hover:text-brand transition-colors">
          {title}
        </h3>

        {/* Short description */}
        {short_desc && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {short_desc}
          </p>
        )}

        {/* Rating */}
        {Number(review_count) > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor"
                 viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1
                       1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8
                       2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
                       1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175
                       0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
                       1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1
                       1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-gray-700">{Number(avg_rating).toFixed(1)}</span>
            <span>({review_count})</span>
          </div>
        )}

        {/* Progress bar */}
        {completionPct > 0 && <ProgressBar pct={completionPct} />}

        {/* CTA button */}
        <button
          onClick={handleCTA}
          className={`${className} mt-1 text-sm`}
        >
          {label}
        </button>
      </div>
    </Link>
  );
}
