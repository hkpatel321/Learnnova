const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const quizController = require('../controllers/quiz.controller');

const router = Router();

router.use(authenticate);

router.get(
  '/courses/:courseId/quizzes',
  requireRole('instructor', 'admin'),
  [param('courseId').isUUID().withMessage('Valid course id is required')],
  validate,
  quizController.getQuizzesByCourse
);

router.post(
  '/courses/:courseId/quizzes',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields([
    'title',
    'lessonId',
    'pointsAttempt1',
    'pointsAttempt2',
    'pointsAttempt3',
    'pointsAttempt4plus',
  ]),
  [
    param('courseId').isUUID().withMessage('Valid course id is required'),
    body('title').trim().isLength({ min: 1, max: 160 }).withMessage('Title is required'),
    body('lessonId').optional({ nullable: true }).isUUID(),
    body('pointsAttempt1').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt2').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt3').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt4plus').optional().isInt({ min: 0, max: 100000 }),
  ],
  validate,
  quizController.createQuiz
);

router.get(
  '/quizzes/:id',
  [param('id').isUUID().withMessage('Valid quiz id is required')],
  validate,
  quizController.getQuizWithQuestions
);

router.put(
  '/quizzes/:id',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields([
    'title',
    'lessonId',
    'pointsAttempt1',
    'pointsAttempt2',
    'pointsAttempt3',
    'pointsAttempt4plus',
  ]),
  [
    param('id').isUUID().withMessage('Valid quiz id is required'),
    body('title').optional().trim().isLength({ min: 1, max: 160 }),
    body('lessonId').optional({ nullable: true }).isUUID(),
    body('pointsAttempt1').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt2').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt3').optional().isInt({ min: 0, max: 100000 }),
    body('pointsAttempt4plus').optional().isInt({ min: 0, max: 100000 }),
  ],
  validate,
  quizController.updateQuiz
);

router.delete(
  '/quizzes/:id',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid quiz id is required')],
  validate,
  quizController.deleteQuiz
);

router.post(
  '/quizzes/:id/questions',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['questionText', 'options']),
  [
    param('id').isUUID().withMessage('Valid quiz id is required'),
    body('questionText').trim().isLength({ min: 1, max: 2000 }).withMessage('Question text is required'),
    body('options').isArray({ min: 2, max: 10 }).withMessage('At least 2 options are required'),
    body('options.*.optionText').trim().isLength({ min: 1, max: 500 }).withMessage('Option text is required'),
    body('options.*.isCorrect').isBoolean().withMessage('isCorrect must be boolean'),
  ],
  validate,
  quizController.addQuestion
);

router.patch(
  '/quizzes/:id/questions/reorder',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['questionIds']),
  [
    param('id').isUUID().withMessage('Valid quiz id is required'),
    body('questionIds').isArray({ min: 1, max: 200 }).withMessage('questionIds must be a non-empty array'),
    body('questionIds.*').isUUID().withMessage('Each question id must be valid'),
  ],
  validate,
  quizController.reorderQuestions
);

router.put(
  '/questions/:id',
  requireRole('instructor', 'admin'),
  rejectUnknownBodyFields(['questionText', 'options']),
  [
    param('id').isUUID().withMessage('Valid question id is required'),
    body('questionText').optional().trim().isLength({ min: 1, max: 2000 }),
    body('options').optional().isArray({ min: 2, max: 10 }),
    body('options.*.optionText').optional().trim().isLength({ min: 1, max: 500 }),
    body('options.*.isCorrect').optional().isBoolean(),
  ],
  validate,
  quizController.updateQuestion
);

router.delete(
  '/questions/:id',
  requireRole('instructor', 'admin'),
  [param('id').isUUID().withMessage('Valid question id is required')],
  validate,
  quizController.deleteQuestion
);

module.exports = router;
