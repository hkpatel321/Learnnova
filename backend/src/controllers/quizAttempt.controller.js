const prisma = require('../config/db');

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

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
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

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
      include: { course: { select: { lessons: true } } },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const pastAttemptsCount = await prisma.quizAttempt.count({
      where: { userId, quizId },
    });
    const attemptNumber = pastAttemptsCount + 1;

    let correctCount = 0;
    const totalCount = quiz.questions.length;
    const correctOptionIds = [];
    const answersReview = [];

    // Map correct options for fast lookup
    const correctOptionsMap = {};
    for (const q of quiz.questions) {
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (correctOpt) {
        correctOptionsMap[q.id] = correctOpt.id;
        correctOptionIds.push(correctOpt.id);
      }
    }

    // Process user's answers
    const answersData = [];
    for (const ans of answers) {
      const question = quiz.questions.find((q) => q.id === ans.questionId);
      const selectedOption = question?.options?.find((o) => o.id === ans.selectedOptionId);
      const correctOption = question?.options?.find((o) => o.id === correctOptionsMap[ans.questionId]);

      const isCorrect = correctOptionsMap[ans.questionId] === ans.selectedOptionId;
      if (isCorrect) correctCount++;

      answersData.push({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        isCorrect,
      });

      answersReview.push({
        questionId: ans.questionId,
        questionText: question?.questionText || '',
        selectedOptionText: selectedOption?.optionText || '',
        correctOptionText: correctOption?.optionText || '',
        isCorrect,
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

        // Potentially update enrollment status to completed
        const allProgress = await tx.lessonProgress.findMany({
          where: { enrollmentId: enrollment.id, isCompleted: true },
        });
        if (allProgress.length === enrollment.course.lessons.length) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'completed' },
          });
        } else if (enrollment.status === 'not_started') {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'in_progress' },
          });
        }
      }

      return { attempt, newTotalPoints };
    });

    return res.json({
      success: true,
      data: {
        passed,
        correct: correctCount,
        total: totalCount,
        correctAnswers: correctCount,
        totalQuestions: totalCount,
        pointsEarned,
        attemptNumber,
        totalPoints: result.newTotalPoints,
        correctOptionIds,
        answersReview,
        attemptedAt: result.attempt.attemptedAt,
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

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.courseId } },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Not enrolled' });
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
