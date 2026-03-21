const getLearnerCourseAccess = async (db, { userId, courseId }) => {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      isPublished: true,
      accessRule: true,
      price: true,
    },
  });

  if (!course || !course.isPublished) {
    return { ok: false, status: 404, message: 'Course not found' };
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: {
      id: true,
      status: true,
      isPaid: true,
      paidAt: true,
      amountPaid: true,
    },
  });

  if (course.accessRule === 'payment') {
    if (!enrollment?.isPaid) {
      return {
        ok: false,
        status: 402,
        code: 'PAYMENT_REQUIRED',
        message: 'You need to buy this course before accessing its content',
        course,
        enrollment: enrollment || null,
      };
    }
  } else if (!enrollment) {
    const message =
      course.accessRule === 'invitation'
        ? 'You need an accepted invitation to access this course'
        : 'You need to enroll before accessing this course';

    return {
      ok: false,
      status: 403,
      message,
      course,
      enrollment: null,
    };
  }

  return {
    ok: true,
    course,
    enrollment: enrollment || null,
  };
};

module.exports = {
  getLearnerCourseAccess,
};
