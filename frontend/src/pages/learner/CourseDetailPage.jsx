import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Search, Star, Trash2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';

const EMPTY_ARRAY = [];

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

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMinutes = (minutesValue) => {
  const total = Number(minutesValue || 0);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

const getInitials = (name) =>
  (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const StarsDisplay = ({ rating = 0, size = 16 }) => {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => {
        const starNumber = idx + 1;
        const fillPercent =
          safe >= starNumber ? 100 : safe > idx ? Math.round((safe - idx) * 100) : 0;
        return (
          <div key={idx} className="relative" style={{ width: size, height: size }}>
            <Star size={size} className="text-amber-300 fill-transparent" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star size={size} className="text-amber-500 fill-amber-500" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ReviewModal = ({ open, onOpenChange, onSubmit, isSubmitting }) => {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = () => {
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }
    onSubmit({ rating, reviewText }, () => {
      setRating(5);
      setReviewText('');
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-xl shadow-xl z-50 focus:outline-none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Rate this course</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              {Array.from({ length: 5 }).map((_, idx) => {
                const value = idx + 1;
                return (
                  <button key={value} type="button" onClick={() => setRating(value)} className="p-1">
                    <Star
                      className={`w-8 h-8 ${rating >= value ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                    />
                  </button>
                );
              })}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full min-h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
              placeholder="Share your learning experience..."
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-70 inline-flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Review
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isLearner = user?.role === 'learner';
  const authScope = isAuthenticated && user?.id ? user.id : 'guest';

  const [activeTab, setActiveTab] = useState('overview');
  const [lessonSearch, setLessonSearch] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [visibleReviews, setVisibleReviews] = useState(5);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const handledStripeSessionIdRef = useRef(null);
  const stripeStatus = searchParams.get('stripe_status');
  const stripeSessionId = searchParams.get('session_id');

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', courseId, authScope],
    queryFn: async () => {
      const res = await axios.get(`/courses/${courseId}/detail`);
      const courseData = res.data?.data?.course || res.data?.course || res.data;
      if (courseData) {
        courseData.published = courseData.isPublished;
        courseData.coverImage = courseData.coverImageUrl;
      }
      return courseData;
    },
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: async () => {
      const res = await axios.get(`/courses/${courseId}/reviews`);
      return Array.isArray(res.data?.data?.reviews) ? res.data.data.reviews : Array.isArray(res.data) ? res.data : res.data?.reviews || [];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ['course-progress', courseId, authScope],
    queryFn: async () => {
      const res = await axios.get(`/progress/courses/${courseId}`);
      return res.data?.data || res.data;
    },
    enabled: isAuthenticated && isLearner,
    retry: false,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (payload) => axios.post(`/courses/${courseId}/reviews`, payload),
    onSuccess: () => {
      toast.success('Review posted! Thank you ⭐');
      queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] });
      setShowReviewModal(false);
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Failed to submit review';
      toast.error(message);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId) => axios.delete(`/courses/${courseId}/reviews/${reviewId}`),
    onSuccess: async () => {
      toast.success('Review deleted');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['course-reviews', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['course-detail', courseId, authScope] }),
      ]);
      setDeletingReviewId(null);
    },
    onError: (error) => {
      setDeletingReviewId(null);
      const message = error?.response?.data?.message || 'Failed to delete review';
      toast.error(message);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/courses/${courseId}/enroll`);
      return res.data?.data?.enrollment || res.data?.enrollment;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['course-progress', courseId, authScope] }),
        queryClient.invalidateQueries({ queryKey: ['course-detail', courseId, authScope] }),
        queryClient.invalidateQueries({ queryKey: ['my-courses'] }),
      ]);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`/courses/${courseId}/payment/verify`, payload);
      return res.data?.data || res.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['course-progress', courseId, authScope] }),
        queryClient.invalidateQueries({ queryKey: ['course-detail', courseId, authScope] }),
        queryClient.invalidateQueries({ queryKey: ['my-courses'] }),
        queryClient.invalidateQueries({ queryKey: ['my-payments'] }),
      ]);
      toast.success('Payment successful. Course unlocked.');
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Payment verification failed';
      toast.error(message);
    },
  });

  const createPaymentOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/courses/${courseId}/payment/order`);
      return res.data?.data || res.data;
    },
  });

  useEffect(() => {
    if (!stripeStatus) return;

    if (stripeStatus === 'cancelled') {
      toast('Checkout was cancelled', { icon: '💳' });
      navigate(`/courses/${courseId}`, { replace: true });
      return;
    }

    if (
      stripeStatus !== 'success' ||
      !stripeSessionId ||
      handledStripeSessionIdRef.current === stripeSessionId ||
      !isLearner ||
      !isAuthenticated
    ) {
      return;
    }

    handledStripeSessionIdRef.current = stripeSessionId;
    verifyPaymentMutation.mutate(
      { sessionId: stripeSessionId },
      {
        onSettled: () => {
          navigate(`/courses/${courseId}`, { replace: true });
        },
      }
    );
  }, [
    courseId,
    isAuthenticated,
    isLearner,
    navigate,
    stripeSessionId,
    stripeStatus,
    verifyPaymentMutation,
  ]);

  const lessons = Array.isArray(course?.lessons) ? course.lessons : EMPTY_ARRAY;
  const filteredLessons = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((lesson) => (lesson.title || '').toLowerCase().includes(q));
  }, [lessons, lessonSearch]);

  const completedLessonIds = new Set(progress?.completedLessonIds || progress?.completed_lessons || []);
  const inProgressLessonIds = new Set(progress?.inProgressLessonIds || progress?.in_progress_lessons || []);
  const completionPercent = Number(
    progress?.completionPercent ?? progress?.completion_percent ?? course?.completionPercent ?? 0
  );
  const isEnrolled = !!(
    progress?.isEnrolled ||
    course?.isEnrolled ||
    course?.enrolled ||
    course?.enrollment
  );
  const isCompletedCourse = completionPercent >= 100 || (progress?.status || '').toLowerCase() === 'completed';
  const isInProgress = completionPercent > 0 && completionPercent < 100;
  const price = Number(course?.price || 0);
  const isPaid = !!(progress?.isPaid || course?.isPaid);
  const requiresPayment = !!(course?.requiresPayment || price > 0);
  const canAccessCourse = !!(
    progress?.isEnrolled ||
    course?.canAccessCourse ||
    (requiresPayment ? isPaid : isEnrolled)
  );
  const isRestricted = ['invitation', 'payment'].includes((course?.accessRule || '').toLowerCase());
  const accessMessage =
    course?.accessMessage ||
    (requiresPayment ? 'Buy this course to unlock the lessons.' : 'Enroll in this course to unlock the lessons.');

  const avgRating =
    Number(course?.avg_rating ?? course?.avgRating ?? 0) ||
    (reviews.length ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length : 0);
  const reviewCount = Number((course?.review_count ?? course?.reviewCount ?? reviews.length) || 0);
  const lessonCount = Number((course?.lesson_count ?? lessons.length) || 0);
  const viewCount = Number((course?.view_count ?? course?.viewCount ?? course?.viewsCount ?? 0) || 0);
  const totalDuration = Number(
    course?.total_duration_mins ??
      course?.totalDurationMinutes ??
      lessons.reduce((sum, lesson) => sum + Number(lesson.durationMinutes || lesson.duration || 0), 0)
  );

  const overviewBullets = useMemo(() => {
    const text = course?.description || '';
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (lines.length > 0) return lines;
    return [
      'Structured lessons with practical guidance',
      'Track your progress across each lesson',
      'Learn at your own pace',
    ];
  }, [course]);

  const ratingDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const n = Math.round(Number(r.rating || 0));
      if (n >= 1 && n <= 5) counts[n] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => {
      const count = counts[star];
      const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
      return { star, percent };
    });
  }, [reviews, reviewCount]);

  const cta = (() => {
    if (isCompletedCourse) {
      return { label: '✓ Completed', className: 'border border-green-300 text-white bg-transparent', action: 'completed' };
    }
    if (requiresPayment && !canAccessCourse) {
      return { label: `Buy with Stripe — ₹${price}`, className: 'bg-amber-500 text-black', action: 'buy' };
    }
    if (isInProgress) {
      return { label: 'Continue Learning →', className: 'bg-white text-[#2D31D4]', action: 'continue' };
    }
    if (!canAccessCourse && !requiresPayment) {
      return { label: 'Start Learning →', className: 'bg-white text-[#2D31D4]', action: 'start' };
    }
    return { label: 'Start Learning →', className: 'bg-white text-[#2D31D4]', action: 'open' };
  })();

  const isBusy =
    enrollMutation.isPending ||
    createPaymentOrderMutation.isPending ||
    verifyPaymentMutation.isPending;

  const completedCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const remainingCount = Math.max(0, lessons.length - completedCount);
  const canManageCourseReviews = user?.role === 'instructor' && course?.instructor?.id === user?.id;

  const onLessonClick = (lesson) => {
    if (!canAccessCourse && isRestricted) {
      toast(accessMessage, { icon: '🔒' });
      return;
    }
    if (!canAccessCourse) {
      toast(accessMessage, { icon: '🔒' });
      return;
    }
    navigate(`/learn/${courseId}/${lesson.id}`);
  };

  const openFirstLesson = () => {
    if (lessons[0]?.id) {
      navigate(`/learn/${courseId}/${lessons[0].id}`);
      return true;
    }
    return false;
  };

  const handleEnrollment = async () => {
    try {
      await enrollMutation.mutateAsync();
      toast.success("You're enrolled! Start learning.");
      openFirstLesson();
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to enroll right now';
      toast.error(message);
    }
  };

  const handlePurchase = async () => {
    try {
      const orderData = await createPaymentOrderMutation.mutateAsync();

      if (orderData?.alreadyPaid) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['course-progress', courseId, authScope] }),
          queryClient.invalidateQueries({ queryKey: ['course-detail', courseId, authScope] }),
          queryClient.invalidateQueries({ queryKey: ['my-courses'] }),
        ]);
        toast.success('Payment already verified for this course');
        openFirstLesson();
        return;
      }

      if (!orderData?.checkoutUrl) {
        toast.error('Stripe checkout URL was not created');
        return;
      }

      toast('Redirecting to secure checkout...', { icon: '💳' });
      window.location.assign(orderData.checkoutUrl);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to start payment';
      toast.error(message);
    }
  };

  const handlePrimaryAction = async () => {
    if (!isLearner) {
      toast('Preview mode for instructors and admins', { icon: '👁️' });
      return;
    }

    if (cta.action === 'buy') {
      await handlePurchase();
      return;
    }

    if (canAccessCourse) {
      if (!openFirstLesson()) {
        toast('This course does not have lessons yet', { icon: '📚' });
      }
      return;
    }

    await handleEnrollment();
  };

  if (courseLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#2D31D4]" />
      </div>
    );
  }

  return (
    <div className="-mx-4 md:-mx-6">
      <section className="bg-[#2D31D4] text-white py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex gap-8">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {(course?.tags || []).map((tag, idx) => (
                <span key={`${tag}-${idx}`} className="text-sm px-2.5 py-1 rounded-full border border-white/80 bg-white/10">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-extrabold font-plus-jakarta-sans">{course?.title || 'Course'}</h1>
            <p className="mt-3 text-base text-white/80 max-w-lg">{course?.shortDescription || course?.description || ''}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                {getInitials(course?.instructor?.name)}
              </div>
              <p className="text-sm font-medium">{course?.instructor?.name || 'Instructor'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-6 text-sm text-white/80">
              <span>⭐ {avgRating.toFixed(1)} ({reviewCount} reviews)</span>
              <span>👁 {viewCount} views</span>
              <span>📚 {lessonCount} lessons</span>
              <span>⏱ {totalDuration} min</span>
            </div>

            {canAccessCourse ? (
              <div className="mt-5 max-w-sm">
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(100, completionPercent))}%` }} />
                </div>
                <p className="mt-1 text-sm text-white/90">{Math.round(completionPercent)}% complete</p>
              </div>
            ) : null}

            <button
              type="button"
              disabled={isBusy}
              className={`mt-6 h-12 w-48 rounded-lg font-semibold disabled:opacity-70 ${isLearner ? cta.className : 'bg-white text-[#2D31D4]'}`}
              onClick={handlePrimaryAction}
            >
              {isBusy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : isLearner ? cta.label : 'Preview Mode'}
            </button>
            {requiresPayment && !canAccessCourse ? (
              <p className="mt-3 max-w-md text-xs text-white/80">
                Demo card: 4242 4242 4242 4242, any future expiry, any CVC, any ZIP/postal code.
              </p>
            ) : null}
          </div>

          <div className="w-80 hidden lg:block">
            {course?.cover_image_url || course?.coverImage ? (
              <img
                src={course.cover_image_url || course.coverImage}
                alt={course?.title || 'Course cover'}
                className="rounded-2xl shadow-xl h-56 w-full object-cover"
              />
            ) : (
              <div className="rounded-2xl shadow-xl h-56 w-full bg-gradient-to-br from-[#4550f0] to-[#1a1dd6] flex items-center justify-center">
                <span className="text-6xl font-bold text-white/90">{(course?.title || 'C').charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-sm border-b-2 ${
              activeTab === 'overview'
                ? 'text-[#2D31D4] border-[#2D31D4] font-semibold'
                : 'text-gray-600 border-transparent'
            }`}
          >
            Course Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-3 text-sm border-b-2 ${
              activeTab === 'reviews'
                ? 'text-[#2D31D4] border-[#2D31D4] font-semibold'
                : 'text-gray-600 border-transparent'
            }`}
          >
            Ratings & Reviews
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'overview' ? (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Course Content</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lessonSearch}
                    onChange={(e) => setLessonSearch(e.target.value)}
                    placeholder="Search lessons..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
                  />
                </div>
              </div>

              {filteredLessons.map((lesson) => {
                const isCompleted = completedLessonIds.has(lesson.id);
                const isInProg = inProgressLessonIds.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onLessonClick(lesson)}
                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 mb-2 hover:bg-[#F4F5FF] transition-colors flex items-center"
                  >
                    <span
                      className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                        isCompleted ? 'bg-[#2D31D4] text-white' : isInProg ? 'bg-gradient-to-r from-[#2D31D4] to-gray-200' : 'border border-gray-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : null}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeStyles[lesson.type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabel[lesson.type] || lesson.type || 'Lesson'}
                    </span>
                    <p className="font-medium text-sm text-gray-900 flex-1 mx-3">{lesson.title}</p>
                    <span className="text-xs text-gray-500">{formatMinutes(lesson.durationMinutes || lesson.duration || 0)}</span>
                  </button>
                );
              })}
            </div>

            <aside className="hidden lg:block w-72 shrink-0">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-28">
                <h3 className="text-base font-semibold text-gray-900">What you'll get</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc list-inside">
                  {overviewBullets.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
                <div className="my-4 border-t border-gray-200" />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handlePrimaryAction}
                  className="w-full py-2.5 rounded-lg bg-[#2D31D4] text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-70"
                >
                  {isBusy ? 'Processing...' : isInProgress ? 'Continue Learning →' : canAccessCourse ? 'Open Course' : requiresPayment ? `Pay with Stripe ₹${price}` : 'Enroll Now'}
                </button>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p>📚 {lessonCount} Lessons</p>
                  <p>✓ {completedCount} Completed</p>
                  <p>○ {remainingCount} Remaining</p>
                  <p>⏱ Total Duration: {formatMinutes(totalDuration)}</p>
                {requiresPayment ? <p>💳 Secure checkout available</p> : null}
                {isPaid ? <p>✓ Payment received</p> : null}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div>
            <div className="flex flex-col lg:flex-row gap-8 py-6">
              <div>
                <p className="text-5xl font-extrabold text-amber-500">{avgRating.toFixed(1)}</p>
                <div className="mt-2">
                  <StarsDisplay rating={avgRating} size={20} />
                </div>
                <p className="mt-2 text-sm text-gray-500">{reviewCount} reviews</p>
                {isAuthenticated && isLearner && canAccessCourse ? (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="mt-4 px-4 py-2 rounded-lg border border-[#2D31D4] text-[#2D31D4] text-sm font-medium hover:bg-[#EEF0FF]"
                  >
                    Write a Review
                  </button>
                ) : null}
              </div>

              <div className="flex-1 max-w-lg space-y-2">
                {ratingDistribution.map((item) => (
                  <div key={item.star} className="flex items-center gap-3">
                    <span className="w-10 text-sm text-gray-600">{item.star} ★</span>
                    <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${item.percent}%` }} />
                    </div>
                    <span className="w-10 text-right text-sm text-gray-500">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                    <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                    <div className="h-3 w-full bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                {reviews.slice(0, visibleReviews).map((review) => (
                  <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EEF0FF] text-[#2D31D4] flex items-center justify-center font-bold text-sm">
                          {getInitials(review.user?.name || review.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.user?.name || review.name || 'Learner'}</p>
                          <StarsDisplay rating={Number(review.rating || 0)} size={14} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {formatDate(review.createdAt || review.created_at)}
                        </span>
                        {(user?.role === 'learner' && review.userId === user?.id) || canManageCourseReviews ? (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmed = window.confirm('Delete this review? This action cannot be undone.');
                              if (!confirmed) return;
                              setDeletingReviewId(review.id);
                              deleteReviewMutation.mutate(review.id);
                            }}
                            disabled={deleteReviewMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingReviewId === review.id && deleteReviewMutation.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {review.reviewText || review.comment || review.text || ''}
                    </p>
                  </div>
                ))}
                {visibleReviews < reviews.length ? (
                  <button
                    type="button"
                    onClick={() => setVisibleReviews((prev) => prev + 5)}
                    className="mt-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Load more
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      <ReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        isSubmitting={submitReviewMutation.isPending}
        onSubmit={(payload, done) => submitReviewMutation.mutate(payload, { onSuccess: done })}
      />
    </div>
  );
}
