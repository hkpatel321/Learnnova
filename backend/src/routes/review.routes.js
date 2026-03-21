const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const reviewController = require('../controllers/review.controller');

const router = Router();

// GET /api/courses/:courseId/reviews (Public - no auth required)
router.get('/courses/:courseId/reviews', reviewController.getCourseReviews);

// POST /api/courses/:courseId/reviews (Learners only)
router.post(
  '/courses/:courseId/reviews',
  authenticate,
  requireRole('learner'),
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('reviewText')
      .optional()
      .trim()
      .isString(),
  ],
  validate,
  reviewController.addOrUpdateReview
);

module.exports = router;
