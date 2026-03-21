const prisma = require('../config/db');

// ── 1. completeLesson ────────────────────────────────────────────

const completeLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // Find lesson and ensure user is enrolled in its course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      include: {
        course: { select: { lessons: { select: { id: true } } } },
        lessonProgress: true,
      },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const enrollmentId = enrollment.id;

    // Mark as completed using Prisma upsert (equivalent to fn_complete_lesson)
    await prisma.$transaction(async (tx) => {
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: { isCompleted: true, completedAt: new Date() },
        create: {
          userId,
          lessonId,
          enrollmentId,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      // Recalculate course status if necessary
      const totalLessons = enrollment.course.lessons.length;
      const allProgress = await tx.lessonProgress.findMany({
        where: { enrollmentId, isCompleted: true },
      });
      const completedCount = allProgress.length;
      
      let newStatus = enrollment.status;
      if (completedCount === totalLessons && totalLessons > 0) {
        newStatus = 'completed';
      } else if (newStatus === 'not_started') {
        newStatus = 'in_progress';
      }

      if (newStatus !== enrollment.status) {
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { status: newStatus },
        });
      }
    });

    // Re-query for updated percentages
    const updatedProgress = await prisma.lessonProgress.findMany({
      where: { enrollmentId, isCompleted: true },
    });
    const completedLessons = updatedProgress.length;
    const totalLessons = enrollment.course.lessons.length;
    const completionPct =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Get the updated status
    const updatedEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { status: true },
    });

    return res.json({
      success: true,
      data: {
        completionPct,
        status: updatedEnrollment.status,
        lessonCompleted: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. getCourseProgress ─────────────────────────────────────────

const getCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          select: {
            title: true,
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                lessonType: true,
                durationMins: true,
                sortOrder: true,
              },
            },
          },
        },
        lessonProgress: {
          select: { lessonId: true, isCompleted: true, completedAt: true },
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    const totalLessons = enrollment.course.lessons.length;
    const completedLessonIds = enrollment.lessonProgress
      .filter((lp) => lp.isCompleted)
      .map((lp) => lp.lessonId);
    const completionPct = totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0;

    // Map lessons to frontend-expected shape
    const lessons = enrollment.course.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.lessonType,
      durationMinutes: l.durationMins || 0,
      sortOrder: l.sortOrder,
    }));

    return res.json({
      success: true,
      data: {
        isEnrolled: true,
        isPaid: enrollment.isPaid,
        paidAt: enrollment.paidAt,
        amountPaid: enrollment.amountPaid,
        status: enrollment.status,
        courseTitle: enrollment.course.title,
        completionPct,
        completedLessonIds,
        lessonStatuses: enrollment.lessonProgress,
        lessons,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  completeLesson,
  getCourseProgress,
};
