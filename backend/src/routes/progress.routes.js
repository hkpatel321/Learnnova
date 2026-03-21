const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const progressController = require('../controllers/progress.controller');
const quizAttemptController = require('../controllers/quizAttempt.controller');

const router = Router();

// All progress & quiz routes require auth and are strictly for learners
router.use(authenticate, requireRole('learner'));

// ── Lesson Progress ──────────────────────────────────────────────

// POST /api/progress/lessons/:lessonId/complete
router.post(
  '/progress/lessons/:lessonId/complete',
  progressController.completeLesson
);

// GET /api/progress/courses/:courseId
router.get(
  '/progress/courses/:courseId',
  progressController.getCourseProgress
);

// POST /api/progress/courses/:courseId/complete
router.post(
  '/progress/courses/:courseId/complete',
  progressController.completeCourse
);

// ── Quiz Attempts ────────────────────────────────────────────────

// GET /api/quiz-attempts/:quizId/start
router.get(
  '/quiz-attempts/:quizId/start',
  quizAttemptController.getQuizForPlayer
);

// POST /api/quiz-attempts/:quizId/submit
router.post(
  '/quiz-attempts/:quizId/submit',
  [
    body('answers')
      .isArray()
      .withMessage('answers must be an array'),
    body('answers.*.questionId')
      .notEmpty()
      .withMessage('questionId required for each answer'),
    body('answers.*.selectedOptionId')
      .notEmpty()
      .withMessage('selectedOptionId required for each answer'),
  ],
  validate,
  quizAttemptController.submitQuiz
);

// GET /api/quiz-attempts/:quizId/history
router.get(
  '/quiz-attempts/:quizId/history',
  quizAttemptController.getQuizAttemptHistory
);

module.exports = router;
