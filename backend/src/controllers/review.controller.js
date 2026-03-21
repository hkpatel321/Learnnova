const prisma = require('../config/db');

// ── 1. addOrUpdateReview ─────────────────────────────────────────

const addOrUpdateReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { rating, reviewText } = req.body;
    const userId = req.user.id;

    const parsedRating = parseInt(rating, 10);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You must be enrolled to leave a review' });
    }

    // Upsert review
    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        rating: parsedRating,
        reviewText: reviewText || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        courseId,
        rating: parsedRating,
        reviewText: reviewText || null,
      },
    });

    return res.status(201).json({ success: true, data: { review } });
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
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
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

module.exports = {
  addOrUpdateReview,
  getCourseReviews,
};
