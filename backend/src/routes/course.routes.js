const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const courseController = require('../controllers/course.controller');

const router = Router();

// ── PUBLIC routes (no auth) ──────────────────────────────────────

// GET /api/courses/catalog
router.get(
  '/catalog',
  [query('search').optional().isString().trim().isLength({ max: 120 })],
  validate,
  courseController.getCatalog
);

// ── AUTHENTICATED any-role routes ────────────────────────────────

// GET /api/courses/:id/detail  (any authenticated user — learner, instructor, admin)
router.get(
  '/:id/detail',
  authenticate,
  [param('id').isUUID().withMessage('Valid course id is required')],
  validate,
  courseController.getCourseDetail
);

// ── POST /api/courses ────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['title']),
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 160 })
      .withMessage('Title must be between 1 and 160 characters'),
  ],
  validate,
  courseController.createCourse
);

// ── GET /api/courses ─────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireRole('instructor', 'admin'),
  [query('search').optional().isString().trim().isLength({ max: 120 })],
  validate,
  courseController.getAllCourses
);

// ── GET /api/courses/:id ─────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid course id is required')],
  validate,
  courseController.getCourseById
);

// ── PUT /api/courses/:id ─────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields([
    'title',
    'shortDesc',
    'description',
    'tags',
    'websiteUrl',
    'responsibleId',
    'visibility',
    'accessRule',
    'price',
  ]),
  [
    param('id').isUUID().withMessage('Valid course id is required'),
    body('title').optional().trim().isLength({ min: 1, max: 160 }),
    body('shortDesc').optional({ nullable: true }).isString().trim().isLength({ max: 280 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('tags').optional().isArray({ max: 30 }).withMessage('tags must be an array'),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('websiteUrl').optional({ nullable: true }).isURL().withMessage('websiteUrl must be a valid URL'),
    body('responsibleId').optional({ nullable: true }).isUUID().withMessage('responsibleId must be a valid user id'),
    body('visibility').optional().isIn(['everyone', 'signed_in']),
    body('accessRule').optional().isIn(['open', 'invitation', 'payment']),
    body('price').optional({ nullable: true }).isFloat({ min: 0, max: 999999 }),
  ],
  validate,
  courseController.updateCourse
);

// ── PATCH /api/courses/:id/publish ───────────────────────────────
router.patch(
  '/:id/publish',
  authenticate,
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid course id is required')],
  validate,
  courseController.togglePublish
);

// ── DELETE /api/courses/:id ──────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  [param('id').isUUID().withMessage('Valid course id is required')],
  validate,
  courseController.deleteCourse
);

// ── POST /api/courses/:id/cover ──────────────────────────────────
router.post(
  '/:id/cover',
  authenticate,
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid course id is required')],
  validate,
  uploadImage.single('cover'),
  courseController.uploadCoverImage
);

module.exports = router;
