const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadAny } = require('../middleware/upload');
const lessonController = require('../controllers/lesson.controller');

const router = Router();

// All lesson routes require authentication
router.use(authenticate);

// ── Nested under /api/courses/:courseId/lessons ───────────────────
// These routes are mounted in course-scoped context

// GET  /api/courses/:courseId/lessons
router.get(
  '/courses/:courseId/lessons',
  requireRole('instructor', 'admin'),
  lessonController.getLessonsByCourse
);

// POST /api/courses/:courseId/lessons
router.post(
  '/courses/:courseId/lessons',
  requireRole('instructor', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('lessonType')
      .isIn(['video', 'document', 'image', 'quiz'])
      .withMessage('lessonType must be video, document, image, or quiz'),
  ],
  validate,
  lessonController.createLesson
);

// PATCH /api/courses/:courseId/lessons/reorder
router.patch(
  '/courses/:courseId/lessons/reorder',
  requireRole('instructor', 'admin'),
  [
    body('lessonIds')
      .isArray({ min: 1 })
      .withMessage('lessonIds must be a non-empty array'),
  ],
  validate,
  lessonController.reorderLessons
);

// ── Standalone lesson routes (/api/lessons/:id) ──────────────────

// GET /api/lessons/:id  (any authenticated user)
router.get('/lessons/:id', lessonController.getLessonById);

// PUT /api/lessons/:id
router.put(
  '/lessons/:id',
  requireRole('instructor', 'admin'),
  uploadAny.single('file'),
  lessonController.updateLesson
);

// DELETE /api/lessons/:id
router.delete(
  '/lessons/:id',
  requireRole('instructor', 'admin'),
  lessonController.deleteLesson
);

// ── Attachment routes ────────────────────────────────────────────

// POST /api/lessons/:id/attachments
router.post(
  '/lessons/:id/attachments',
  requireRole('instructor', 'admin'),
  uploadAny.single('file'),
  [
    body('label')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Label cannot be empty if provided'),
  ],
  validate,
  lessonController.addAttachment
);

// DELETE /api/attachments/:id
router.delete(
  '/attachments/:id',
  requireRole('instructor', 'admin'),
  lessonController.deleteAttachment
);

module.exports = router;
