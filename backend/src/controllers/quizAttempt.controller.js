const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');
const { syncEnrollmentCourseProgress } = require('../utils/courseProgress');

// ── 3. getQuizForPlayer ──────────────────────────────────────────

const getQuizForPlayer = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              select: { id: true, optionText: true, sortOrder: true }, // NO is_correct
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const access = await getLearnerCourseAccess(prisma, { userId, courseId: quiz.courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const attemptCount = await prisma.quizAttempt.count({
      where: { userId, quizId },
    });

    return res.json({
      success: true,
      data: {
        quiz,
        attemptCount,
        rewards: {
          attempt1: quiz.pointsAttempt1,
          attempt2: quiz.pointsAttempt2,
          attempt3: quiz.pointsAttempt3,
          attempt4plus: quiz.pointsAttempt4plus,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 4. submitQuiz ────────────────────────────────────────────────

const submitQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // [{ questionId, selectedOptionId }]
    const userId = req.user.id;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers must be an array' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const access = await getLearnerCourseAccess(prisma, { userId, courseId: quiz.courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
      include: { course: { select: { lessons: true } } },
    });

    const pastAttemptsCount = await prisma.quizAttempt.count({
      where: { userId, quizId },
    });
    const attemptNumber = pastAttemptsCount + 1;

    let correctCount = 0;
    const totalCount = quiz.questions.length;

    // Map correct options for fast lookup
    const correctOptionsMap = {};
    const validQuestionIds = new Set();
    const validOptionsByQuestion = new Map();
    for (const q of quiz.questions) {
      validQuestionIds.add(q.id);
      validOptionsByQuestion.set(
        q.id,
        new Set(q.options.map((option) => option.id))
      );

      const correctOpt = q.options.find((o) => o.isCorrect);
      if (correctOpt) {
        correctOptionsMap[q.id] = correctOpt.id;
      }
    }

    if (answers.length !== totalCount) {
      return res.status(400).json({
        success: false,
        message: 'All quiz questions must be answered exactly once',
      });
    }

    // Process user's answers
    const answersData = [];
    const seenQuestionIds = new Set();
    for (const ans of answers) {
      if (seenQuestionIds.has(ans.questionId)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate answers are not allowed',
        });
      }

      if (!validQuestionIds.has(ans.questionId)) {
        return res.status(400).json({
          success: false,
          message: 'Answer contains an invalid question id',
        });
      }

      if (!validOptionsByQuestion.get(ans.questionId)?.has(ans.selectedOptionId)) {
        return res.status(400).json({
          success: false,
          message: 'Answer contains an invalid option for the question',
        });
      }

      seenQuestionIds.add(ans.questionId);

      const isCorrect = correctOptionsMap[ans.questionId] === ans.selectedOptionId;
      if (isCorrect) correctCount++;

      const question = quiz.questions.find((item) => item.id === ans.questionId);
      const selectedOption = question?.options.find((item) => item.id === ans.selectedOptionId);
      const correctOption = question?.options.find((item) => item.isCorrect);

      answersData.push({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        isCorrect,
        questionText: question?.questionText || '',
        selectedOptionText: selectedOption?.optionText || '',
        correctOptionText: correctOption?.optionText || '',
      });
    }

    // All correct = passed
    const passed = correctCount === totalCount && totalCount > 0;

    // Calculate points based on attempt number (if passed)
    let pointsEarned = 0;
    if (passed) {
      if (attemptNumber === 1) pointsEarned = quiz.pointsAttempt1;
      else if (attemptNumber === 2) pointsEarned = quiz.pointsAttempt2;
      else if (attemptNumber === 3) pointsEarned = quiz.pointsAttempt3;
      else pointsEarned = quiz.pointsAttempt4plus;
    }

    // Transaction logic (replaces fn_award_quiz_points and fn_complete_lesson)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create quiz attempt
      const attempt = await tx.quizAttempt.create({
        data: {
          userId,
          quizId,
          enrollmentId: enrollment.id,
          correctAnswers: correctCount,
          totalQuestions: totalCount,
          passed,
          attemptNumber,
          pointsEarned,
          answers: {
            create: answersData.map((a) => ({
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId,
              isCorrect: a.isCorrect,
            })),
          },
        },
      });

      // 2. Award points to user if any
      let newTotalPoints = 0;
      if (pointsEarned > 0) {
        const user = await tx.user.update({
          where: { id: userId },
          data: { totalPoints: { increment: pointsEarned } },
        });
        newTotalPoints = user.totalPoints;
      } else {
        const user = await tx.user.findUnique({ where: { id: userId } });
        newTotalPoints = user.totalPoints;
      }

      // 3. Complete lesson if associated lesson exists and user passed
      if (passed && quiz.lessonId) {
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId: quiz.lessonId } },
          update: { isCompleted: true, completedAt: new Date() },
          create: {
            userId,
            lessonId: quiz.lessonId,
            enrollmentId: enrollment.id,
            isCompleted: true,
            completedAt: new Date(),
          },
        });

        await syncEnrollmentCourseProgress(tx, enrollment.id);
      }

      return { attempt, newTotalPoints };
    });

    return res.json({
      success: true,
      data: {
        passed,
        correctAnswers: correctCount,
        totalQuestions: totalCount,
        pointsEarned,
        attemptNumber,
        totalPoints: result.newTotalPoints,
        answersReview: answersData.map((item) => ({
          questionId: item.questionId,
          questionText: item.questionText,
          selectedOptionText: item.selectedOptionText,
          correctOptionText: item.correctOptionText,
          isCorrect: item.isCorrect,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 5. getQuizAttemptHistory ─────────────────────────────────────

const getQuizAttemptHistory = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    // Verify enrollment
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const access = await getLearnerCourseAccess(prisma, { userId, courseId: quiz.courseId });
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {}),
      });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId },
      include: {
        answers: true,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    return res.json({ success: true, data: { attempts } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuizForPlayer,
  submitQuiz,
  getQuizAttemptHistory,
};
