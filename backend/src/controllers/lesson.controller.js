const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');

const normalizeOptionalString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const parseOptionalInt = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapLessonForClient = (lesson) => ({
  ...lesson,
  type: lesson.lessonType,
  durationMinutes: lesson.durationMins ?? 0,
  responsibleUserId: lesson.responsibleId || '',
  quizId: lesson.quizId ?? lesson.quiz?.id ?? null,
});

const verifyCourseAccess = async (courseId, user) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) return { error: 'Course not found', status: 404 };

  if (user.role === 'instructor' && course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }

  return { course };
};

const verifyLessonAccess = async (lessonId, user) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true, quiz: { select: { id: true } } },
  });

  if (!lesson) return { error: 'Lesson not found', status: 404 };

  if (user.role === 'instructor' && lesson.course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }

  return { lesson };
};

const getLessonsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { attachments: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const data = lessons.map((lesson) => {
      const { _count, ...rest } = lesson;
      return {
        ...mapLessonForClient(rest),
        attachmentCount: _count.attachments,
      };
    });

    return res.json({ success: true, data: { lessons: data } });
  } catch (err) {
    next(err);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const lessonType = req.body.lessonType || req.body.type || 'video';
    const title = String(req.body.title || '').trim();
    const description = normalizeOptionalString(req.body.description);
    const videoUrl = normalizeOptionalString(req.body.videoUrl);
    const durationMins = parseOptionalInt(req.body.durationMins ?? req.body.durationMinutes);
    const allowDownload = req.body.allowDownload === true || req.body.allowDownload === 'true';
    const responsibleId = normalizeOptionalString(req.body.responsibleId ?? req.body.responsibleUserId);
    const quizId = normalizeOptionalString(req.body.quizId);

    if (!title) {
      return res.status(400).json({ success: false, message: 'Lesson title is required' });
    }

    if (lessonType === 'video' && !videoUrl) {
      return res.status(400).json({ success: false, message: 'Video URL is required for video lessons' });
    }

    if (lessonType === 'quiz' && !quizId) {
      return res.status(400).json({ success: false, message: 'Quiz selection is required for quiz lessons' });
    }

    const maxSort = await prisma.lesson.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        lessonType,
        description,
        videoUrl: lessonType === 'video' ? videoUrl : null,
        durationMins: lessonType === 'video' ? durationMins : null,
        fileUrl: null,
        allowDownload: ['document', 'image'].includes(lessonType) ? allowDownload : false,
        responsibleId,
        sortOrder,
      },
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (lessonType === 'quiz' && quizId) {
      await prisma.quiz.update({
        where: { id: quizId },
        data: { lessonId: lesson.id },
      });
    }

    return res.status(201).json({ success: true, data: { lesson: mapLessonForClient(lesson) } });
  } catch (err) {
    next(err);
  }
};

const updateLesson = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const currentLesson = access.lesson;
    const nextLessonType = req.body.lessonType || req.body.type || currentLesson.lessonType;
    const nextQuizId = normalizeOptionalString(req.body.quizId);
    const data = {};

    if (req.body.title !== undefined) data.title = String(req.body.title).trim();
    if (req.body.description !== undefined) data.description = normalizeOptionalString(req.body.description);
    if (req.body.videoUrl !== undefined) data.videoUrl = normalizeOptionalString(req.body.videoUrl);
    if (req.body.durationMins !== undefined || req.body.durationMinutes !== undefined) {
      data.durationMins = parseOptionalInt(req.body.durationMins ?? req.body.durationMinutes);
    }
    if (req.body.allowDownload !== undefined) {
      data.allowDownload = req.body.allowDownload === true || req.body.allowDownload === 'true';
    }
    if (req.body.responsibleId !== undefined || req.body.responsibleUserId !== undefined) {
      data.responsibleId = normalizeOptionalString(req.body.responsibleId ?? req.body.responsibleUserId);
    }
    if (req.body.sortOrder !== undefined) {
      data.sortOrder = parseOptionalInt(req.body.sortOrder);
    }
    if (req.body.lessonType !== undefined || req.body.type !== undefined) {
      data.lessonType = nextLessonType;
    }

    if (data.title !== undefined && !data.title) {
      return res.status(400).json({ success: false, message: 'Lesson title is required' });
    }

    if (nextLessonType === 'video') {
      const effectiveVideoUrl = data.videoUrl !== undefined ? data.videoUrl : currentLesson.videoUrl;
      if (!effectiveVideoUrl) {
        return res.status(400).json({ success: false, message: 'Video URL is required for video lessons' });
      }
    }

    if (nextLessonType === 'quiz') {
      const effectiveQuizId = req.body.quizId !== undefined ? nextQuizId : currentLesson.quiz?.id;
      if (!effectiveQuizId) {
        return res.status(400).json({ success: false, message: 'Quiz selection is required for quiz lessons' });
      }
    }

    if (req.file) {
      data.fileUrl = `/uploads/${req.file.filename}`;
    }

    if (nextLessonType !== 'video') {
      data.videoUrl = null;
      data.durationMins = null;
    }

    if (!['document', 'image'].includes(nextLessonType)) {
      data.allowDownload = false;
      if (!req.file) {
        data.fileUrl = null;
      }
    }

    if (nextLessonType === 'quiz') {
      data.fileUrl = null;
    }

    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data,
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (req.body.quizId !== undefined && currentLesson.quiz?.id && currentLesson.quiz.id !== nextQuizId) {
      await prisma.quiz.update({
        where: { id: currentLesson.quiz.id },
        data: { lessonId: null },
      });
    }

    if (nextLessonType === 'quiz' && nextQuizId) {
      await prisma.quiz.update({
        where: { id: nextQuizId },
        data: { lessonId: updated.id },
      });
    }

    return res.json({ success: true, data: { lesson: mapLessonForClient(updated) } });
  } catch (err) {
    next(err);
  }
};

const uploadLessonFile = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        lessonType: 'document',
        videoUrl: null,
        durationMins: null,
      },
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return res.status(201).json({ success: true, data: { lesson: mapLessonForClient(updated) } });
  } catch (err) {
    next(err);
  }
};

const uploadLessonImage = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data: {
        fileUrl: `/uploads/${req.file.filename}`,
        lessonType: 'image',
        videoUrl: null,
        durationMins: null,
      },
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return res.status(201).json({ success: true, data: { lesson: mapLessonForClient(updated) } });
  } catch (err) {
    next(err);
  }
};

const deleteLesson = async (req, res, next) => {
  try {
    if (req.headers['x-confirm-delete'] !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Deletion requires header X-Confirm-Delete: true',
      });
    }

    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    await prisma.lesson.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Lesson deleted' });
  } catch (err) {
    next(err);
  }
};

const reorderLessons = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'lessonIds must be a non-empty array',
      });
    }

    await prisma.$transaction(
      lessonIds.map((id, index) =>
        prisma.lesson.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return res.json({ success: true, message: 'Lessons reordered' });
  } catch (err) {
    next(err);
  }
};

const addAttachment = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const { attachmentType, label } = req.body;
    let { url } = req.body;

    if (req.file) {
      url = `/uploads/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Either a file upload or a URL is required',
      });
    }

    const maxSort = await prisma.lessonAttachment.aggregate({
      where: { lessonId: req.params.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const attachment = await prisma.lessonAttachment.create({
      data: {
        lessonId: req.params.id,
        attachmentType: attachmentType || 'file',
        label: label || req.file?.originalname || 'Attachment',
        url,
        sortOrder,
      },
    });

    return res.status(201).json({ success: true, data: { attachment } });
  } catch (err) {
    next(err);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    await prisma.lessonAttachment.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    next(err);
  }
};

const getLessonById = async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: {
        quiz: { select: { id: true } },
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (req.user.role === 'learner') {
      const access = await getLearnerCourseAccess(prisma, {
        userId: req.user.id,
        courseId: lesson.courseId,
      });

      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
          ...(access.code ? { code: access.code } : {}),
        });
      }
    }

    return res.json({ success: true, data: { lesson: mapLessonForClient(lesson) } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLessonsByCourse,
  createLesson,
  updateLesson,
  uploadLessonFile,
  uploadLessonImage,
  deleteLesson,
  reorderLessons,
  addAttachment,
  deleteAttachment,
  getLessonById,
};
