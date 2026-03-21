const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadAny } = require('../middleware/upload');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const lessonController = require('../controllers/lesson.controller');

const router = Router();

// All lesson routes require authentication
router.use(authenticate);

// ── Nested under /api/courses/:courseId/lessons ───────────────────

router.get(
  '/courses/:courseId/lessons',
  requireRole('instructor', 'admin'),
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  lessonController.getLessonsByCourse
);

router.post(
  '/courses/:courseId/lessons',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields([
    'title',
    'type',
    'lessonType',
    'description',
    'videoUrl',
    'durationMins',
    'durationMinutes',
    'allowDownload',
    'responsibleId',
    'responsibleUserId',
    'quizId',
  ]),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Title is required'),
    body('type').optional().isIn(['video', 'document', 'image', 'quiz']),
    body('lessonType').optional().isIn(['video', 'document', 'image', 'quiz']),
    body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('videoUrl').optional({ nullable: true }).isURL().withMessage('videoUrl must be a valid URL'),
    body('durationMins').optional({ nullable: true }).isInt({ min: 0, max: 1440 }),
    body('durationMinutes').optional({ nullable: true }).isInt({ min: 0, max: 1440 }),
    body('allowDownload').optional().isBoolean().toBoolean(),
    body('responsibleId').optional({ nullable: true }).isUUID(),
    body('responsibleUserId').optional({ nullable: true }).isUUID(),
    body('quizId').optional({ nullable: true }).isUUID(),
    body().custom((value) => {
      if (!value?.type && !value?.lessonType) {
        throw new Error('Either type or lessonType is required');
      }
      return true;
    }),
  ],
  validate,
  lessonController.createLesson
);

router.patch(
  '/courses/:courseId/lessons/reorder',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['lessonIds']),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('lessonIds').isArray({ min: 1, max: 200 }).withMessage('lessonIds must be a non-empty array'),
    body('lessonIds.*').isUUID().withMessage('Each lesson id must be valid'),
  ],
  validate,
  lessonController.reorderLessons
);

// ── Standalone lesson routes (/api/lessons/:id) ──────────────────

router.get(
  '/lessons/:id',
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  lessonController.getLessonById
);

router.put(
  '/lessons/:id',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  uploadAny.single('file'),
  lessonController.updateLesson
);

router.post(
  '/lessons/:id/file',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  uploadAny.single('file'),
  lessonController.uploadLessonFile
);

router.post(
  '/lessons/:id/image',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  uploadAny.single('file'),
  lessonController.uploadLessonImage
);

router.delete(
  '/lessons/:id',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  lessonController.deleteLesson
);

// ── Attachment routes ────────────────────────────────────────────

router.post(
  '/lessons/:id/attachments',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid lesson id is required')],
  validate,
  uploadAny.single('file'),
  rejectUnknownBodyFields(['attachmentType', 'label', 'url']),
  [
    body('attachmentType').optional().isIn(['file', 'link']),
    body('label').optional().trim().isLength({ min: 1, max: 160 }).withMessage('Label cannot be empty if provided'),
    body('url').optional().isURL().withMessage('url must be a valid URL'),
  ],
  validate,
  lessonController.addAttachment
);

router.delete(
  '/attachments/:id',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid attachment id is required')],
  validate,
  lessonController.deleteAttachment
);

module.exports = router;
