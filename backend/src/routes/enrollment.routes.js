const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const enrollmentController = require('../controllers/enrollment.controller');

const router = Router();

router.use(authenticate);

router.post(
  '/courses/:courseId/enroll',
  requireRole('learner'),
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  enrollmentController.enrollInCourse
);

router.get('/enrollments/me', requireRole('learner'), enrollmentController.getMyEnrollments);

router.get(
  '/enrollments/:id',
  [param('id').isUUID().withMessage('Valid enrollment id is required')],
  validate,
  enrollmentController.getEnrollmentById
);

router.post(
  '/courses/:courseId/attendees',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['emails']),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('emails').isArray({ min: 1, max: 200 }).withMessage('Provide an array of emails'),
    body('emails.*').isEmail().normalizeEmail().withMessage('Must be a valid email array'),
  ],
  validate,
  enrollmentController.addAttendees
);

router.get(
  '/courses/:courseId/attendees',
  requireRole('instructor', 'admin'),
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  enrollmentController.getAttendees
);

router.post(
  '/courses/:courseId/contact',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['subject', 'message']),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('subject').trim().isLength({ min: 1, max: 160 }).withMessage('Subject is required'),
    body('message').trim().isLength({ min: 1, max: 5000 }).withMessage('Message is required'),
  ],
  validate,
  enrollmentController.contactAttendees
);

router.post(
  '/invitations/:token/accept',
  requireRole('learner'),
  [param('token').isUUID().withMessage('Valid invitation token is required')],
  validate,
  enrollmentController.acceptInvitation
);

module.exports = router;
