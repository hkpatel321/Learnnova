const ensureCourseLearnerLink = async (db, { userId, courseId }) => {
  return db.courseLearner.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  });
};

const hasCourseLearnerLink = async (db, { userId, courseId }) => {
  const link = await db.courseLearner.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { userId: true },
  });

  return !!link;
};

module.exports = {
  ensureCourseLearnerLink,
  hasCourseLearnerLink,
};
