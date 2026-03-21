const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const quizController = require('../controllers/quiz.controller');

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

// ── Course-scoped quiz routes ────────────────────────────────────

// GET /api/courses/:courseId/quizzes
router.get(
  '/courses/:courseId/quizzes',
  requireRole('instructor', 'admin'),
  quizController.getQuizzesByCourse
);

// POST /api/courses/:courseId/quizzes
router.post(
  '/courses/:courseId/quizzes',
  requireRole('instructor', 'admin'),
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  quizController.createQuiz
);

// ── Standalone quiz routes ───────────────────────────────────────

// GET /api/quizzes/:id  (any authenticated — learners get isCorrect hidden)
router.get('/quizzes/:id', quizController.getQuizWithQuestions);

// PUT /api/quizzes/:id
router.put(
  '/quizzes/:id',
  requireRole('instructor', 'admin'),
  quizController.updateQuiz
);

// DELETE /api/quizzes/:id
router.delete(
  '/quizzes/:id',
  requireRole('instructor', 'admin'),
  quizController.deleteQuiz
);

// ── Question routes ──────────────────────────────────────────────

// POST /api/quizzes/:id/questions
router.post(
  '/quizzes/:id/questions',
  requireRole('instructor', 'admin'),
  [
    body('questionText')
      .trim()
      .notEmpty()
      .withMessage('Question text is required'),
    body('options')
      .isArray({ min: 2 })
      .withMessage('At least 2 options are required'),
    body('options.*.optionText')
      .trim()
      .notEmpty()
      .withMessage('Option text is required'),
  ],
  validate,
  quizController.addQuestion
);

// PATCH /api/quizzes/:id/questions/reorder
router.patch(
  '/quizzes/:id/questions/reorder',
  requireRole('instructor', 'admin'),
  [
    body('questionIds')
      .isArray({ min: 1 })
      .withMessage('questionIds must be a non-empty array'),
  ],
  validate,
  quizController.reorderQuestions
);

// PUT /api/questions/:id
router.put(
  '/questions/:id',
  requireRole('instructor', 'admin'),
  quizController.updateQuestion
);

// DELETE /api/questions/:id
router.delete(
  '/questions/:id',
  requireRole('instructor', 'admin'),
  quizController.deleteQuestion
);

module.exports = router;
