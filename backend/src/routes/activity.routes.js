const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const activityController = require('../controllers/activity.controller');

const router = Router();

router.use(authenticate, requireRole('learner'));

router.get('/users/me/activity-heatmap', activityController.getMyActivityHeatmap);

router.post(
  '/users/me/activity-events',
  rejectUnknownBodyFields(['activityType', 'courseId', 'lessonId', 'metadata']),
  [
    body('activityType').isString().trim().notEmpty().withMessage('activityType is required'),
    body('courseId').optional({ nullable: true }).isUUID().withMessage('courseId must be a valid id'),
    body('lessonId').optional({ nullable: true }).isUUID().withMessage('lessonId must be a valid id'),
  ],
  validate,
  activityController.trackActivity
);

module.exports = router;
