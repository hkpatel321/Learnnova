const prisma = require('../config/db');



const getReportingData = async (req, res, next) => {
  try {
    const { courseId, status, search } = req.query;

    
    const where = {};
    const courseWhere = {};

    
    if (req.user.role === 'instructor') {
      courseWhere.responsibleId = req.user.id;
    }

    
    if (courseId) {
      where.courseId = courseId;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.user = { name: { contains: search, mode: 'insensitive' } };
    }

    
    if (req.user.role === 'instructor') {
      where.course = { ...courseWhere };
    }

    
    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, lessons: { select: { id: true } } } },
        lessonProgress: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    
    const rows = enrollments.map((e) => {
      const totalLessons = e.course?.lessons.length || 0;
      const completedLessons = e.lessonProgress.filter((lp) => lp.isCompleted).length;
      const completionPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: e.id,
        enrollmentId: e.id,
        courseId: e.course?.id || null,
        participantId: e.user.id,
        participantName: e.user.name,
        participantEmail: e.user.email,
        courseName: e.course?.title || 'Unknown Course',
        status: e.status,
        enrolledDate: e.enrolledAt,
        startDate: e.startedAt,
        completedDate: e.completedAt,
        completionPercent: completionPct,
        timeSpentMinutes: e.timeSpentMins,
      };
    });

    
    const summaryWhere = req.user.role === 'instructor' ? { course: { responsibleId: req.user.id } } : {};
    
    
    const allEnrs = await prisma.enrollment.findMany({
      where: summaryWhere,
      select: { status: true },
    });

    const overview = {
      total_participants: allEnrs.length,
      yet_to_start: allEnrs.filter((e) => e.status === 'not_started').length,
      in_progress: allEnrs.filter((e) => e.status === 'in_progress').length,
      completed: allEnrs.filter((e) => e.status === 'completed').length,
    };

    return res.json({
      success: true,
      data: { overview, rows },
    });
  } catch (err) {
    next(err);
  }
};



const getCourseStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (req.user.role === 'instructor' && course.responsibleId !== req.user.id) {
      console.error(`[reporting.controller] Forbidden. Expected responsibleId: ${course.responsibleId}, but user id: ${req.user.id}`);
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }

    
    const allEnrs = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        lessonProgress: true,
      },
    });

    const totalEnrolled = allEnrs.length;
    let completedCount = 0;

    
    const lessonsCount = await prisma.lesson.count({ where: { courseId } });

    allEnrs.forEach((e) => {
      const completedLps = e.lessonProgress.filter((lp) => lp.isCompleted).length;
      e.completion_pct = lessonsCount > 0 ? Math.round((completedLps / lessonsCount) * 100) : 0;
      if (e.status === 'completed' || e.completion_pct === 100) completedCount++;
    });

    const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;

    
    const quizzes = await prisma.quiz.findMany({ where: { courseId }, select: { id: true } });
    const quizIds = quizzes.map((q) => q.id);

    let avgQuizScore = 0;
    if (quizIds.length > 0) {
      const attemptAgg = await prisma.quizAttempt.aggregate({
        where: { quizId: { in: quizIds } },
        _avg: { correctAnswers: true },
      });
      avgQuizScore = attemptAgg._avg.correctAnswers ? parseFloat(attemptAgg._avg.correctAnswers.toFixed(2)) : 0;
    }

    
    const reviewAgg = await prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = reviewAgg._avg.rating ? parseFloat(reviewAgg._avg.rating.toFixed(2)) : 0;
    const reviewCount = reviewAgg._count.id;

    return res.json({
      success: true,
      data: {
        stats: {
          totalEnrolled,
          completionRate,
          avgQuizScore,
          avgRating,
          reviewCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReportingData,
  getCourseStats,
};
