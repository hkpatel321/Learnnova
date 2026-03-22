const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');
const {
  getCourseProgressSnapshot,
  syncEnrollmentCourseProgress,
} = require('../utils/courseProgress');

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

    const access = await getLearnerCourseAccess(prisma, { userId, courseId: lesson.courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      include: {
        course: { select: { lessons: { select: { id: true } } } },
        lessonProgress: true,
      },
    });

    const enrollmentId = enrollment.id;

    // Mark as completed using Prisma upsert (equivalent to fn_complete_lesson)
    const result = await prisma.$transaction(async (tx) => {
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

      return syncEnrollmentCourseProgress(tx, enrollmentId);
    });

    return res.json({
      success: true,
      data: {
        completionPct: result?.snapshot?.completionPct || 0,
        completionPercent: result?.snapshot?.completionPct || 0,
        completedLessons: result?.snapshot?.completedLessons || 0,
        totalLessons: result?.snapshot?.totalLessons || enrollment.course.lessons.length,
        completedLessonIds: result?.snapshot?.completedLessonIds || [],
        inProgressLessonIds: result?.snapshot?.inProgressLessonIds || [],
        status: result?.snapshot?.status || enrollment.status,
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

    const access = await getLearnerCourseAccess(prisma, { userId, courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

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

    const snapshot = getCourseProgressSnapshot(enrollment);

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
        status: snapshot.status,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
        courseTitle: enrollment.course.title,
        completionPct: snapshot.completionPct,
        completionPercent: snapshot.completionPct,
        totalLessons: snapshot.totalLessons,
        completedLessons: snapshot.completedLessons,
        completedLessonIds: snapshot.completedLessonIds,
        inProgressLessonIds: snapshot.inProgressLessonIds,
        lessonStatuses: enrollment.lessonProgress,
        lessons,
      },
    });
  } catch (err) {
    next(err);
  }
};

const completeCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const access = await getLearnerCourseAccess(prisma, { userId, courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          select: {
            lessons: {
              select: { id: true },
            },
          },
        },
        lessonProgress: {
          select: {
            lessonId: true,
            isCompleted: true,
            completedAt: true,
          },
        },
      },
    });

    const snapshot = getCourseProgressSnapshot(enrollment);
    if (snapshot.totalLessons === 0 || snapshot.completedLessons < snapshot.totalLessons) {
      return res.status(400).json({
        success: false,
        message: 'Complete all lessons before marking the course complete',
      });
    }

    const result = await prisma.$transaction((tx) =>
      syncEnrollmentCourseProgress(tx, enrollment.id)
    );

    return res.json({
      success: true,
      data: {
        status: result?.snapshot?.status || 'completed',
        completionPct: result?.snapshot?.completionPct || 100,
        completionPercent: result?.snapshot?.completionPct || 100,
        completedLessons: result?.snapshot?.completedLessons || snapshot.completedLessons,
        totalLessons: result?.snapshot?.totalLessons || snapshot.totalLessons,
      },
    });
  } catch (err) {
    next(err);
  }
};

const addLessonTimeSpent = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const minutesSpent = Number(req.body.minutesSpent || 0);

    if (!Number.isInteger(minutesSpent) || minutesSpent <= 0) {
      return res.status(400).json({
        success: false,
        message: 'minutesSpent must be a positive integer',
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const access = await getLearnerCourseAccess(prisma, { userId, courseId: lesson.courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const enrollment = await prisma.enrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.courseId,
        },
      },
      data: {
        timeSpentMins: {
          increment: minutesSpent,
        },
      },
      select: {
        id: true,
        timeSpentMins: true,
      },
    });

    return res.json({
      success: true,
      data: {
        lessonId,
        addedMinutes: minutesSpent,
        totalTimeSpentMins: enrollment.timeSpentMins,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  completeLesson,
  getCourseProgress,
  completeCourse,
  addLessonTimeSpent,
};
