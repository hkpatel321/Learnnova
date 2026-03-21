const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const progressController = require('../controllers/progress.controller');
const quizAttemptController = require('../controllers/quizAttempt.controller');

const router = Router();

router.use(authenticate, requireRole('learner'));

router.post(
  '/progress/lessons/:lessonId/complete',
  [param('lessonId').isUUID().withMessage('Valid lesson id is required')],
  validate,
  progressController.completeLesson
);

router.get(
  '/progress/courses/:courseId',
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  progressController.getCourseProgress
);

router.post(
  '/progress/courses/:courseId/complete',
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  progressController.completeCourse
);

router.get(
  '/quiz-attempts/:quizId/start',
  [param('quizId').isUUID().withMessage('Valid quiz id is required')],
  validate,
  quizAttemptController.getQuizForPlayer
);

router.post(
  '/quiz-attempts/:quizId/submit',
  rejectUnknownBodyFields(['answers']),
  [
    param('quizId').isUUID().withMessage('Valid quiz id is required'),
    body('answers').isArray({ min: 1, max: 200 }).withMessage('answers must be an array'),
    body('answers.*.questionId').isUUID().withMessage('questionId must be a valid id'),
    body('answers.*.selectedOptionId').isUUID().withMessage('selectedOptionId must be a valid id'),
  ],
  validate,
  quizAttemptController.submitQuiz
);

router.get(
  '/quiz-attempts/:quizId/history',
  [param('quizId').isUUID().withMessage('Valid quiz id is required')],
  validate,
  quizAttemptController.getQuizAttemptHistory
);

module.exports = router;
