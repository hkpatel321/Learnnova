const prisma = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────

/** Verify course access for quiz operations */
const verifyCourseAccess = async (courseId, user) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: 'Course not found', status: 404 };
  if (user.role === 'instructor' && course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }
  return { course };
};

/** Verify quiz access by checking quiz → course ownership */
const verifyQuizAccess = async (quizId, user) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });
  if (!quiz) return { error: 'Quiz not found', status: 404 };
  if (user.role === 'instructor' && quiz.course.responsibleId !== user.id) {
    return { error: 'Access forbidden', status: 403 };
  }
  return { quiz };
};

// ── 1. getQuizzesByCourse ────────────────────────────────────────

const getQuizzesByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = quizzes.map((q) => {
      const { _count, ...rest } = q;
      return { ...rest, questionCount: _count.questions };
    });

    return res.json({ success: true, data: { quizzes: data } });
  } catch (err) {
    next(err);
  }
};

// ── 2. createQuiz ────────────────────────────────────────────────

const createQuiz = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const access = await verifyCourseAccess(courseId, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const {
      title,
      lessonId,
      pointsAttempt1,
      pointsAttempt2,
      pointsAttempt3,
      pointsAttempt4plus,
    } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title,
        lessonId: lessonId || null,
        pointsAttempt1: pointsAttempt1 ?? 10,
        pointsAttempt2: pointsAttempt2 ?? 7,
        pointsAttempt3: pointsAttempt3 ?? 4,
        pointsAttempt4plus: pointsAttempt4plus ?? 2,
      },
    });

    return res.status(201).json({ success: true, data: { quiz } });
  } catch (err) {
    next(err);
  }
};

// ── 3. updateQuiz ────────────────────────────────────────────────

const updateQuiz = async (req, res, next) => {
  try {
    const access = await verifyQuizAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const allowedFields = [
      'title',
      'lessonId',
      'pointsAttempt1',
      'pointsAttempt2',
      'pointsAttempt3',
      'pointsAttempt4plus',
    ];

    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    const updated = await prisma.quiz.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, data: { quiz: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 4. deleteQuiz ────────────────────────────────────────────────

const deleteQuiz = async (req, res, next) => {
  try {
    const access = await verifyQuizAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    await prisma.quiz.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    next(err);
  }
};

// ── 5. getQuizWithQuestions ──────────────────────────────────────

const getQuizWithQuestions = async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { responsibleId: true } },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Determine whether to reveal correct answers
    const isOwnerOrAdmin =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' && quiz.course.responsibleId === req.user.id);

    // Strip is_correct from options for learners
    const questions = quiz.questions.map((q) => ({
      ...q,
      options: q.options.map((o) => {
        if (isOwnerOrAdmin) return o;
        const { isCorrect, ...safe } = o;
        return safe;
      }),
    }));

    const { course, questions: _q, ...quizData } = quiz;

    return res.json({
      success: true,
      data: { quiz: { ...quizData, questions } },
    });
  } catch (err) {
    next(err);
  }
};

// ── 6. addQuestion ───────────────────────────────────────────────

const addQuestion = async (req, res, next) => {
  try {
    const access = await verifyQuizAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const { questionText, options } = req.body;

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 options are required',
      });
    }

    const hasCorrect = options.some((o) => o.isCorrect === true);
    if (!hasCorrect) {
      return res.status(400).json({
        success: false,
        message: 'At least one option must be marked as correct',
      });
    }

    // Auto sort_order
    const maxSort = await prisma.quizQuestion.aggregate({
      where: { quizId: req.params.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    // Create question with nested options
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: req.params.id,
        questionText,
        sortOrder,
        options: {
          create: options.map((o, idx) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect || false,
            sortOrder: idx,
          })),
        },
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return res.status(201).json({ success: true, data: { question } });
  } catch (err) {
    next(err);
  }
};

// ── 7. updateQuestion ────────────────────────────────────────────

const updateQuestion = async (req, res, next) => {
  try {
    const existing = await prisma.quizQuestion.findUnique({
      where: { id: req.params.id },
      include: { quiz: { include: { course: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (
      req.user.role === 'instructor' &&
      existing.quiz.course.responsibleId !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }

    const { questionText, options } = req.body;

    // Validate new options if provided
    if (options) {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 options are required',
        });
      }

      const hasCorrect = options.some((o) => o.isCorrect === true);
      if (!hasCorrect) {
        return res.status(400).json({
          success: false,
          message: 'At least one option must be marked as correct',
        });
      }
    }

    // Transaction: update question text + replace all options
    const updated = await prisma.$transaction(async (tx) => {
      // Update question text if provided
      if (questionText) {
        await tx.quizQuestion.update({
          where: { id: req.params.id },
          data: { questionText },
        });
      }

      // Replace options if provided
      if (options) {
        await tx.quizOption.deleteMany({ where: { questionId: req.params.id } });

        await tx.quizOption.createMany({
          data: options.map((o, idx) => ({
            questionId: req.params.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect || false,
            sortOrder: idx,
          })),
        });
      }

      return tx.quizQuestion.findUnique({
        where: { id: req.params.id },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    return res.json({ success: true, data: { question: updated } });
  } catch (err) {
    next(err);
  }
};

// ── 8. deleteQuestion ────────────────────────────────────────────

const deleteQuestion = async (req, res, next) => {
  try {
    const existing = await prisma.quizQuestion.findUnique({
      where: { id: req.params.id },
      include: { quiz: { include: { course: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (
      req.user.role === 'instructor' &&
      existing.quiz.course.responsibleId !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    }

    await prisma.quizQuestion.delete({ where: { id: req.params.id } });

    return res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    next(err);
  }
};

// ── 9. reorderQuestions ──────────────────────────────────────────

const reorderQuestions = async (req, res, next) => {
  try {
    const access = await verifyQuizAccess(req.params.id, req.user);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionIds must be a non-empty array',
      });
    }

    await prisma.$transaction(
      questionIds.map((id, index) =>
        prisma.quizQuestion.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return res.json({ success: true, message: 'Questions reordered' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuizzesByCourse,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizWithQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
};
