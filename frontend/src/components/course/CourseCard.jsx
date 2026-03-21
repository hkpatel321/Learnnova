import React from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveMediaUrl } from '../../lib/media';

const getCTA = (course, isAuthenticated) => {
  const isEnrolled = !!(course.isEnrolled || course.enrolled || course.enrollment);
  const completion = Math.max(0, Math.min(100, Number(course.completionPercent || course.progress || 0)));
  const isCompleted = completion >= 100;
  const inProgress = (course.status || '').toLowerCase() === 'in_progress' || (completion > 0 && completion < 100);
  const price = Number(course.price || 0);
  const requiresPayment = !!(course.requiresPayment || price > 0);
  const isPaid = !!(course.isPaid || course.paymentStatus === 'paid');

  if (!isAuthenticated) {
    return { label: 'Join Course', className: 'border border-[#2D31D4] text-[#2D31D4] bg-white', action: 'login' };
  }
  if (requiresPayment && !isPaid && !isEnrolled) {
    return { label: `Buy — ₹${price}`, className: 'bg-amber-500 text-black', action: 'buy' };
  }
  if (!isEnrolled) {
    return { label: 'Start Learning →', className: 'bg-[#2D31D4] text-white', action: 'start' };
  }
  if (isCompleted) {
    return { label: '✓ Completed', className: 'bg-emerald-500 text-white', action: 'open' };
  }
  if (inProgress) {
    return { label: 'Continue →', className: 'bg-[#2D31D4] text-white', action: 'continue' };
  }
  return { label: 'Start Learning →', className: 'bg-[#2D31D4] text-white', action: 'start' };
};

const CourseCard = ({ course, isAuthenticated }) => {
  const navigate = useNavigate();
  const cta = getCTA(course, isAuthenticated);
  const completion = Math.max(0, Math.min(100, Number(course.completionPercent || course.progress || 0)));
  const isEnrolled = !!(course.isEnrolled || course.enrolled || course.enrollment);
  const coverSrc = resolveMediaUrl(course.coverImageUrl || course.cover_image_url || course.coverImage);

  const handleClick = () => {
    if (cta.action === 'login') {
      navigate('/login');
      return;
    }
    navigate(`/courses/${course.id}`);
  };

  return (
    <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {coverSrc ? (
        <img
          src={coverSrc}
          alt={course.title || 'Course cover'}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-[#2D31D4] to-[#1a1dd6] flex items-center justify-center">
          <span className="text-4xl font-bold text-white/90">
            {(course.title || 'C').charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {(course.tags || []).slice(0, 3).map((tag, idx) => (
            <span key={`${tag}-${idx}`} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF0FF] text-[#2D31D4]">
              {tag}
            </span>
          ))}
        </div>

        <h3 className="mt-2 text-[15px] font-semibold text-gray-900 line-clamp-2">{course.title || 'Untitled Course'}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{course.description || 'Start learning with this course.'}</p>

        {isEnrolled ? (
          <div className="mt-3">
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#2D31D4]" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{completion}% complete</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleClick}
          className={`mt-3 h-10 w-full rounded-lg text-sm font-semibold ${cta.className}`}
        >
          {cta.label}
        </button>
      </div>
    </article>
  );
};

export default CourseCard;
