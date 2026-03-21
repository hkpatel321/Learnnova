const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const reviewController = require('../controllers/review.controller');

const router = Router();

router.get(
  '/courses/:courseId/reviews',
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  reviewController.getCourseReviews
);

router.post(
  '/courses/:courseId/reviews',
  authenticate,
  requireRole('learner'),
  rejectUnknownBodyFields(['rating', 'reviewText', 'comment']),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
    body('reviewText').optional({ nullable: true }).trim().isString().isLength({ max: 2000 }),
    body('comment').optional({ nullable: true }).trim().isString().isLength({ max: 2000 }),
  ],
  validate,
  reviewController.addOrUpdateReview
);

router.delete(
  '/courses/:courseId/reviews/:reviewId',
  authenticate,
  requireRole('learner', 'instructor', 'admin'),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    param('reviewId').isUUID().withMessage('Valid review id is required'),
  ],
  validate,
  reviewController.deleteReview
);

module.exports = router;
