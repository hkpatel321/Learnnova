const prisma = require('../config/db');
const { getLearnerCourseAccess } = require('../utils/learnerAccess');
const { syncEnrollmentCourseProgress } = require('../utils/courseProgress');

const DEFAULT_ATTEMPT_REWARD_RULES = {
  attempt1: 4,
  attempt2: 3,
  attempt3: 2,
  attempt4plus: 1,
};

const clampReward = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.min(4, Math.round(numeric));
};

const getAttemptRewardRules = (quiz) => {
  const attempt1 = Math.max(1, clampReward(quiz?.pointsAttempt1, DEFAULT_ATTEMPT_REWARD_RULES.attempt1));
  const attempt2 = Math.min(
    clampReward(quiz?.pointsAttempt2, DEFAULT_ATTEMPT_REWARD_RULES.attempt2),
    Math.max(0, attempt1 - 1)
  );
  const attempt3 = Math.min(
    clampReward(quiz?.pointsAttempt3, DEFAULT_ATTEMPT_REWARD_RULES.attempt3),
    Math.max(0, attempt2 - 1)
  );
  const attempt4plus = Math.min(
    clampReward(quiz?.pointsAttempt4plus, DEFAULT_ATTEMPT_REWARD_RULES.attempt4plus),
    Math.max(0, attempt3 - 1)
  );

  return {
    attempt1,
    attempt2,
    attempt3,
    attempt4plus,
  };
};

const getRewardPerCorrectAnswer = (rules, attemptNumber) => {
  if (attemptNumber <= 1) return rules.attempt1;
  if (attemptNumber === 2) return rules.attempt2;
  if (attemptNumber === 3) return rules.attempt3;
  return rules.attempt4plus;
};

const mapAttemptSummary = (attempt, rewardRules) => {
  const scorePoints =
    Number(attempt.correctAnswers || 0) *
    getRewardPerCorrectAnswer(rewardRules, Number(attempt.attemptNumber || 1));

  return {
    attempt: attempt.attemptNumber,
    points: scorePoints,
    scorePoints,
    awardedPoints: Number(attempt.pointsEarned || 0),
    correctAnswers: Number(attempt.correctAnswers || 0),
    date: attempt.attemptedAt,
  };
};

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

    const rewardRules = getAttemptRewardRules(quiz);
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId },
      select: {
        attemptNumber: true,
        correctAnswers: true,
        pointsEarned: true,
        attemptedAt: true,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: {
        quiz,
        attemptCount: attempts.length,
        attempts: attempts.map((attempt) => mapAttemptSummary(attempt, rewardRules)),
        rewards: rewardRules,
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

    const rewardRules = getAttemptRewardRules(quiz);
    const pastAttempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId },
      select: {
        attemptNumber: true,
        correctAnswers: true,
      },
    });
    const attemptNumber = pastAttempts.length + 1;

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

    const rewardPerCorrect = getRewardPerCorrectAnswer(rewardRules, attemptNumber);
    const currentAttemptScore = correctCount * rewardPerCorrect;
    const previousBestScore = pastAttempts.reduce((best, attempt) => {
      const priorReward = getRewardPerCorrectAnswer(rewardRules, attempt.attemptNumber);
      return Math.max(best, Number(attempt.correctAnswers || 0) * priorReward);
    }, 0);

    // All correct = passed
    const passed = correctCount === totalCount && totalCount > 0;

    // Learners earn only the improvement above their previous best score for this quiz.
    const pointsEarned = Math.max(0, currentAttemptScore - previousBestScore);

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
        attemptedAt: result.attempt.attemptedAt,
        rewardRules,
        rewardPerCorrect,
        scorePoints: currentAttemptScore,
        previousBestScore,
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
      select: {
        attemptNumber: true,
        correctAnswers: true,
        pointsEarned: true,
        attemptedAt: true,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    const rewardRules = getAttemptRewardRules(quiz);

    return res.json({
      success: true,
      data: {
        attempts: attempts.map((attempt) => mapAttemptSummary(attempt, rewardRules)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuizForPlayer,
  submitQuiz,
  getQuizAttemptHistory,
};
