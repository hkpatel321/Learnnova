const prisma = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────

/** Verify the course exists and optionally that the user owns it */
const verifyCourseAccess = async (courseId, user) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) return { error: 'Course not found', status: 404 };

  if (user.role === 'instructor' && course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }

  return { course };
};

/** Verify a lesson exists and that the user has access via the parent course */
const verifyLessonAccess = async (lessonId, user) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });

  if (!lesson) return { error: 'Lesson not found', status: 404 };

  if (user.role === 'instructor' && lesson.course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }

  return { lesson };
};

// ── 1. getLessonsByCourse ────────────────────────────────────────

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
        _count: { select: { attachments: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const data = lessons.map((l) => {
      const { _count, ...rest } = l;
      return { ...rest, attachmentCount: _count.attachments };
    });

    return res.json({ success: true, data: { lessons: data } });
  } catch (err) {
    next(err);
  }
};

// ── 2. createLesson ──────────────────────────────────────────────

const createLesson = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const {
      title,
      lessonType,
      description,
      videoUrl,
      durationMins,
      allowDownload,
      responsibleId,
    } = req.body;

    // Auto sort_order
    const maxSort = await prisma.lesson.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        lessonType: lessonType || req.body.type || 'video',
        description: description || null,
        videoUrl: videoUrl || null,
        durationMins: durationMins ? parseInt(durationMins, 10) : (req.body.durationMinutes ? parseInt(req.body.durationMinutes, 10) : null),
        allowDownload: allowDownload || false,
        responsibleId: responsibleId || null,
        sortOrder,
      },
    });

    return res.status(201).json({ success: true, data: { lesson } });
  } catch (err) {
    next(err);
  }
};

// ── 3. updateLesson ──────────────────────────────────────────────

const updateLesson = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const allowedFields = [
      'title',
      'lessonType',
      'description',
      'videoUrl',
      'durationMins',
      'allowDownload',
      'responsibleId',
      'sortOrder',
    ];

    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    // Parse numeric fields
    if (data.durationMins !== undefined) {
      data.durationMins = data.durationMins ? parseInt(data.durationMins, 10) : null;
    } else if (req.body.durationMinutes !== undefined) {
      data.durationMins = req.body.durationMinutes ? parseInt(req.body.durationMinutes, 10) : null;
    }
    
    if (req.body.type) {
      data.lessonType = req.body.type;
    }
    
    if (data.sortOrder !== undefined) {
      data.sortOrder = parseInt(data.sortOrder, 10);
    }

    // Handle file upload (document / image lesson types)
    if (req.file) {
      data.fileUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, data: { lesson: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 3b. uploadLessonFile ────────────────────────────────────────

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
      },
    });

    return res.status(201).json({ success: true, data: { lesson: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 3c. uploadLessonImage ───────────────────────────────────────

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
      },
    });

    return res.status(201).json({ success: true, data: { lesson: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 4. deleteLesson ──────────────────────────────────────────────

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

// ── 5. reorderLessons ────────────────────────────────────────────

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

    // Transaction: update each lesson's sort_order
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

// ── 6. addAttachment ─────────────────────────────────────────────

const addAttachment = async (req, res, next) => {
  try {
    const access = await verifyLessonAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const { attachmentType, label } = req.body;
    let { url } = req.body;

    // If a file was uploaded, use its path instead
    if (req.file) {
      url = `/uploads/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Either a file upload or a URL is required',
      });
    }

    // Auto sort_order for attachments
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

// ── 7. deleteAttachment ──────────────────────────────────────────

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

// ── 8. getLessonById ─────────────────────────────────────────────

const getLessonById = async (req, res, next) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    return res.json({ success: true, data: { lesson } });
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
