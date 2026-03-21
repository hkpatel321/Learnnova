const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');

// ── 1. addOrUpdateReview ─────────────────────────────────────────

const addOrUpdateReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { rating, reviewText, comment } = req.body;
    const userId = req.user.id;
    const normalizedReviewText =
      typeof reviewText === 'string'
        ? reviewText.trim() || null
        : typeof comment === 'string'
          ? comment.trim() || null
          : null;

    const parsedRating = parseInt(rating, 10);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const access = await getLearnerCourseAccess(prisma, { userId, courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    // Upsert review
    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        rating: parsedRating,
        reviewText: normalizedReviewText,
      },
      create: {
        userId,
        courseId,
        rating: parsedRating,
        reviewText: normalizedReviewText,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        review: {
          id: review.id,
          rating: review.rating,
          reviewText: review.reviewText,
          comment: review.reviewText,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          user: review.user,
          userName: review.user?.name || null,
          avatarUrl: review.user?.avatarUrl || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. getCourseReviews ──────────────────────────────────────────

const getCourseReviews = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Fetch aggregate rating and count
    const agg = await prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = agg._avg.rating ? parseFloat(agg._avg.rating.toFixed(2)) : 0;
    const reviewCount = agg._count.id;

    // Fetch review list
    const reviews = await prisma.review.findMany({
      where: { courseId },
      include: {
        user: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      rating: r.rating,
      reviewText: r.reviewText,
      comment: r.reviewText,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        name: r.user.name,
        avatarUrl: r.user.avatarUrl,
      },
      userName: r.user.name,
      avatarUrl: r.user.avatarUrl,
    }));

    return res.json({
      success: true,
      data: {
        avgRating,
        reviewCount,
        reviews: data,
      },
    });
  } catch (err) {
    next(err);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { courseId, reviewId } = req.params;
    const requester = req.user;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        course: {
          select: {
            id: true,
            responsibleId: true,
          },
        },
      },
    });

    if (!review || review.courseId !== courseId) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const isOwnLearnerReview = requester.role === 'learner' && review.userId === requester.id;
    const isInstructorCourseOwner =
      requester.role === 'instructor' && review.course?.responsibleId === requester.id;
    const isAdmin = requester.role === 'admin';

    if (!isOwnLearnerReview && !isInstructorCourseOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this review',
      });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addOrUpdateReview,
  getCourseReviews,
  deleteReview,
};
