const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollment.controller');

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Learner Enrollment Routes ──────────────────────────────────────

// POST /api/courses/:courseId/enroll
router.post(
  '/courses/:courseId/enroll',
  requireRole('learner'),
  enrollmentController.enrollInCourse
);

// GET /api/enrollments/me
router.get(
  '/enrollments/me',
  requireRole('learner'),
  enrollmentController.getMyEnrollments
);

// GET /api/enrollments/:id
router.get(
  '/enrollments/:id',
  enrollmentController.getEnrollmentById
);

// ── Course Attendee/Invitation Routes ──────────────────────────────

// POST /api/courses/:courseId/attendees
router.post(
  '/courses/:courseId/attendees',
  requireRole('instructor', 'admin'),
  [
    body('emails')
      .isArray({ min: 1 })
      .withMessage('Provide an array of emails'),
    body('emails.*')
      .isEmail()
      .withMessage('Must be a valid email array'),
  ],
  validate,
  enrollmentController.addAttendees
);

// GET /api/courses/:courseId/attendees
router.get(
  '/courses/:courseId/attendees',
  requireRole('instructor', 'admin'),
  enrollmentController.getAttendees
);

router.post(
  '/courses/:courseId/contact',
  requireRole('instructor', 'admin'),
  [
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required'),
  ],
  validate,
  enrollmentController.contactAttendees
);

// ── Invitation Acceptance ──────────────────────────────────────────

// POST /api/invitations/:token/accept
router.post(
  '/invitations/:token/accept',
  requireRole('learner'),
  enrollmentController.acceptInvitation
);

module.exports = router;
