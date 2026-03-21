const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const courseController = require('../controllers/course.controller');

const router = Router();

// ── PUBLIC routes (no auth) ──────────────────────────────────────

// GET /api/courses/catalog
router.get('/catalog', courseController.getCatalog);

// ── AUTHENTICATED any-role routes ────────────────────────────────

// GET /api/courses/:id/detail  (any authenticated user — learner, instructor, admin)
router.get('/:id/detail', authenticate, courseController.getCourseDetail);

// ── POST /api/courses ────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole('instructor', 'admin'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),
  ],
  validate,
  courseController.createCourse
);

// ── GET /api/courses ─────────────────────────────────────────────
router.get('/', authenticate, requireRole('instructor', 'admin'), courseController.getAllCourses);

// ── GET /api/courses/:id ─────────────────────────────────────────
router.get('/:id', authenticate, requireRole('instructor', 'admin'), courseController.getCourseById);

// ── PUT /api/courses/:id ─────────────────────────────────────────
router.put('/:id', authenticate, requireRole('instructor', 'admin'), courseController.updateCourse);

// ── PATCH /api/courses/:id/publish ───────────────────────────────
router.patch('/:id/publish', authenticate, requireRole('instructor', 'admin'), courseController.togglePublish);

// ── DELETE /api/courses/:id ──────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  courseController.deleteCourse
);

// ── POST /api/courses/:id/cover ──────────────────────────────────
router.post(
  '/:id/cover',
  authenticate,
  requireRole('instructor', 'admin'),
  uploadImage.single('cover'),
  courseController.uploadCoverImage
);

module.exports = router;
