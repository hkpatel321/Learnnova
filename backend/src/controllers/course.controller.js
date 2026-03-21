const prisma = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────

/** Fetch a course with aggregated lesson stats + responsible name */
const courseWithStats = async (courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      responsible: { select: { name: true } },
      lessons: { select: { id: true, durationMins: true } },
    },
  });

  if (!course) return null;

  const lessonCount = course.lessons.length;
  const totalDurationMins = course.lessons.reduce(
    (sum, l) => sum + (l.durationMins || 0),
    0
  );

  const { lessons, responsible, ...rest } = course;
  return {
    ...rest,
    responsibleName: responsible?.name || null,
    lessonCount,
    totalDurationMins,
  };
};

// ── 1. createCourse ──────────────────────────────────────────────

const createCourse = async (req, res, next) => {
  try {
    const { title } = req.body;

    const course = await prisma.course.create({
      data: {
        title,
        responsibleId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: { course },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. getAllCourses ──────────────────────────────────────────────

const getAllCourses = async (req, res, next) => {
  try {
    const { search } = req.query;

    // Build where clause
    const where = {};

    // Instructors see only their own courses
    if (req.user.role === 'instructor') {
      where.responsibleId = req.user.id;
    }

    // Optional title search (case-insensitive)
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        responsible: { select: { name: true } },
        lessons: { select: { id: true, durationMins: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to flatten and add aggregated fields
    const data = courses.map((c) => {
      const lessonCount = c.lessons.length;
      const totalDurationMins = c.lessons.reduce(
        (sum, l) => sum + (l.durationMins || 0),
        0
      );
      const { lessons, responsible, ...rest } = c;
      return {
        ...rest,
        responsibleName: responsible?.name || null,
        lessonCount,
        totalDurationMins,
      };
    });

    return res.json({ success: true, data: { courses: data } });
  } catch (err) {
    next(err);
  }
};

// ── 3. getCourseById ─────────────────────────────────────────────

const getCourseById = async (req, res, next) => {
  try {
    const course = await courseWithStats(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Instructors can only view their own courses
    if (req.user.role === 'instructor' && course.responsibleId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    return res.json({ success: true, data: { course } });
  } catch (err) {
    next(err);
  }
};

// ── 4. updateCourse ──────────────────────────────────────────────

const updateCourse = async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Instructors can only update their own courses
    if (req.user.role === 'instructor' && existing.responsibleId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    // Pick only allowed fields from body
    const allowedFields = [
      'title',
      'shortDesc',
      'description',
      'tags',
      'websiteUrl',
      'responsibleId',
      'visibility',
      'accessRule',
      'price',
    ];

    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    // Validation: cannot remove websiteUrl if course is published
    if (existing.isPublished && data.websiteUrl === null) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove website URL from a published course',
      });
    }

    // Validation: payment access rule requires a price
    const effectiveAccessRule = data.accessRule || existing.accessRule;
    const effectivePrice = data.price !== undefined ? data.price : existing.price;

    if (effectiveAccessRule === 'payment' && !effectivePrice) {
      return res.status(400).json({
        success: false,
        message: 'Price is required when access rule is payment',
      });
    }

    // Convert price to Decimal if present
    if (data.price !== undefined && data.price !== null) {
      data.price = parseFloat(data.price);
    }

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, data: { course: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 5. togglePublish ─────────────────────────────────────────────

const togglePublish = async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Instructors can only toggle their own courses
    if (req.user.role === 'instructor' && existing.responsibleId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    const willPublish = !existing.isPublished;

    // Cannot publish without a website URL
    if (willPublish && !existing.websiteUrl) {
      return res.status(400).json({
        success: false,
        message: 'Website URL is required before publishing',
      });
    }

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        isPublished: willPublish,
        publishedAt: willPublish ? new Date() : null,
      },
    });

    return res.json({ success: true, data: { course: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 6. deleteCourse ──────────────────────────────────────────────

const deleteCourse = async (req, res, next) => {
  try {
    const existing = await prisma.course.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    await prisma.course.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
};

// ── 7. uploadCoverImage ──────────────────────────────────────────

const uploadCoverImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
      });
    }

    const existing = await prisma.course.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Instructors can only update their own courses
    if (req.user.role === 'instructor' && existing.responsibleId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }

    const coverImageUrl = `/uploads/covers/${req.file.filename}`;

    await prisma.course.update({
      where: { id: req.params.id },
      data: { coverImageUrl },
    });

    return res.json({
      success: true,
      data: { coverImageUrl },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  togglePublish,
  deleteCourse,
  uploadCoverImage,
};
