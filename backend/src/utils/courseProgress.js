const getCourseProgressSnapshot = (enrollment) => {
  const lessons = Array.isArray(enrollment?.course?.lessons) ? enrollment.course.lessons : [];
  const lessonProgress = Array.isArray(enrollment?.lessonProgress) ? enrollment.lessonProgress : [];

  const completedLessonIds = lessonProgress
    .filter((item) => item.isCompleted)
    .map((item) => item.lessonId);

  const completedLessonIdSet = new Set(completedLessonIds);
  const inProgressLessonIds = lessons
    .map((lesson) => lesson.id)
    .filter((lessonId) => !completedLessonIdSet.has(lessonId));

  const totalLessons = lessons.length;
  const completedLessons = completedLessonIds.length;
  const completionPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let status = 'not_started';
  if (totalLessons > 0 && completedLessons >= totalLessons) {
    status = 'completed';
  } else if (completedLessons > 0) {
    status = 'in_progress';
  }

  return {
    totalLessons,
    completedLessons,
    completedLessonIds,
    inProgressLessonIds,
    completionPct,
    status,
  };
};

const syncEnrollmentCourseProgress = async (tx, enrollmentId) => {
  const enrollment = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        select: {
          lessons: {
            select: {
              id: true,
            },
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

  if (!enrollment) {
    return null;
  }

  const snapshot = getCourseProgressSnapshot(enrollment);
  const completedAtValues = enrollment.lessonProgress
    .filter((item) => item.isCompleted && item.completedAt)
    .map((item) => item.completedAt)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const firstCompletedAt = completedAtValues[0] || null;
  const lastCompletedAt = completedAtValues[completedAtValues.length - 1] || null;

  const shouldSetStartedAt =
    snapshot.completedLessons > 0 && !enrollment.startedAt && firstCompletedAt;
  const shouldSetCompletedAt =
    snapshot.status === 'completed' &&
    ((!enrollment.completedAt && lastCompletedAt) ||
      (enrollment.status !== 'completed' && lastCompletedAt));
  const shouldClearCompletedAt = snapshot.status !== 'completed' && enrollment.completedAt;

  const updateData = {};

  if (enrollment.status !== snapshot.status) {
    updateData.status = snapshot.status;
  }

  if (shouldSetStartedAt) {
    updateData.startedAt = firstCompletedAt;
  }

  if (shouldSetCompletedAt) {
    updateData.completedAt = lastCompletedAt;
  } else if (shouldClearCompletedAt) {
    updateData.completedAt = null;
  }

  const updatedEnrollment =
    Object.keys(updateData).length > 0
      ? await tx.enrollment.update({
          where: { id: enrollmentId },
          data: updateData,
        })
      : enrollment;

  return {
    enrollment: updatedEnrollment,
    snapshot,
  };
};

module.exports = {
  getCourseProgressSnapshot,
  syncEnrollmentCourseProgress,
};
