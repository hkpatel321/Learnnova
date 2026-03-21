import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

// ── GET /api/quizzes/:id ──────────────────────────────────────────────────────
// Returns quiz metadata with nested questions and options.
// is_correct is NEVER included in any response from this file.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  // Fetch quiz
  const quizResult = await query(
    `SELECT id, title, course_id, lesson_id,
            points_attempt_1, points_attempt_2,
            points_attempt_3, points_attempt_4plus
     FROM quizzes
     WHERE id = $1`,
    [id],
  );

  if (quizResult.rowCount === 0) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  const quiz = quizResult.rows[0];

  // Verify enrollment
  const enrollResult = await query(
    `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2`,
    [user_id, quiz.course_id],
  );

  if (enrollResult.rowCount === 0) {
    return res.status(403).json({ error: 'You are not enrolled in this course.' });
  }

  // Fetch all questions for this quiz (sorted)
  const questionsResult = await query(
    `SELECT id, question_text, sort_order
     FROM quiz_questions
     WHERE quiz_id = $1
     ORDER BY sort_order ASC`,
    [id],
  );

  // Fetch all options for those questions in one query — is_correct excluded
  const questionIds = questionsResult.rows.map((q) => q.id);

  let optionRows = [];
  if (questionIds.length > 0) {
    const optResult = await query(
      `SELECT id, question_id, option_text, sort_order
       FROM quiz_options
       WHERE question_id = ANY($1::uuid[])
       ORDER BY question_id, sort_order ASC`,
      [questionIds],
    );
    optionRows = optResult.rows;
  }

  // Nest options under their question
  const questions = questionsResult.rows.map((q) => ({
    id:            q.id,
    question_text: q.question_text,
    sort_order:    q.sort_order,
    options: optionRows
      .filter((o) => o.question_id === q.id)
      .map(({ id, option_text, sort_order }) => ({ id, option_text, sort_order })),
  }));

  res.json({
    quiz: { ...quiz, questions },
  });
});

// ── GET /api/quizzes/:id/my-attempts ─────────────────────────────────────────
// Returns attempt summary for the current user on this quiz.
router.get('/:id/my-attempts', async (req, res) => {
  const { id: quiz_id } = req.params;
  const user_id = req.user.id;

  const result = await query(
    `SELECT
       COUNT(*)                                                   AS attempt_count,
       BOOL_OR(passed)                                            AS last_passed,
       (ARRAY_AGG(points_earned   ORDER BY attempted_at DESC))[1] AS last_points_earned,
       (ARRAY_AGG(correct_answers ORDER BY attempted_at DESC))[1] AS last_correct_answers,
       (ARRAY_AGG(total_questions ORDER BY attempted_at DESC))[1] AS last_total_questions
     FROM quiz_attempts
     WHERE user_id = $1 AND quiz_id = $2`,
    [user_id, quiz_id],
  );

  const row = result.rows[0];

  res.json({
    attempt_count:        Number(row.attempt_count),
    last_passed:          row.last_passed ?? null,
    last_points_earned:   row.last_points_earned  != null ? Number(row.last_points_earned)  : null,
    last_correct_answers: row.last_correct_answers != null ? Number(row.last_correct_answers) : null,
    last_total_questions: row.last_total_questions != null ? Number(row.last_total_questions) : null,
  });
});

// ── POST /api/quizzes/:id/submit ──────────────────────────────────────────────
// Grade a quiz submission, persist answers, and award points.
// Body: { enrollment_id, answers: [{ question_id, selected_option_id }] }
router.post('/:id/submit', async (req, res) => {
  const { id: quiz_id } = req.params;
  const user_id = req.user.id;
  const { enrollment_id, answers } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!enrollment_id) {
    return res.status(400).json({ error: 'enrollment_id is required.' });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers array is required.' });
  }

  // ── Fetch quiz (need course_id + exists check) ────────────────────────────
  const quizResult = await query(
    `SELECT id, course_id FROM quizzes WHERE id = $1`,
    [quiz_id],
  );

  if (quizResult.rowCount === 0) {
    return res.status(404).json({ error: 'Quiz not found.' });
  }

  const { course_id } = quizResult.rows[0];

  // ── Verify enrollment belongs to this user ────────────────────────────────
  const enrollResult = await query(
    `SELECT id FROM enrollments
     WHERE id = $1 AND user_id = $2 AND course_id = $3`,
    [enrollment_id, user_id, course_id],
  );

  if (enrollResult.rowCount === 0) {
    return res.status(403).json({ error: 'Enrollment not found or access denied.' });
  }

  // ── Fetch all questions for this quiz ─────────────────────────────────────
  // Used both for validation and to determine total_questions.
  const questionsResult = await query(
    `SELECT id FROM quiz_questions WHERE quiz_id = $1`,
    [quiz_id],
  );

  const validQuestionIds = new Set(questionsResult.rows.map((q) => q.id));
  const total_questions = validQuestionIds.size;

  // Validate every submitted question_id belongs to this quiz
  for (const ans of answers) {
    if (!validQuestionIds.has(ans.question_id)) {
      return res.status(400).json({
        error: `question_id ${ans.question_id} does not belong to this quiz.`,
      });
    }
  }

  // ── Fetch correct options + all option text ────────────────────────────────
  const optionsResult = await query(
    `SELECT question_id, id AS option_id, option_text, is_correct
     FROM quiz_options
     WHERE question_id = ANY($1::uuid[])
     ORDER BY question_id, sort_order ASC`,
    [Array.from(validQuestionIds)],
  );

  // Build lookup: question_id → correct option_id
  const correctMap = {};
  // Build lookup: option_id → option_text
  const optionTextMap = {};
  // Build lookup: question_id → [{ id, option_text, is_correct }]
  const optionsByQuestion = {};
  for (const row of optionsResult.rows) {
    optionTextMap[row.option_id] = row.option_text;
    if (row.is_correct) correctMap[row.question_id] = row.option_id;
    if (!optionsByQuestion[row.question_id]) optionsByQuestion[row.question_id] = [];
    optionsByQuestion[row.question_id].push({
      id: row.option_id,
      option_text: row.option_text,
      is_correct: row.is_correct,
    });
  }

  // ── Fetch question text ───────────────────────────────────────────────────
  const questionTextResult = await query(
    `SELECT id, question_text, sort_order
     FROM quiz_questions
     WHERE quiz_id = $1
     ORDER BY sort_order ASC`,
    [quiz_id],
  );
  const questionTextMap = {};
  const questionOrder = [];
  for (const row of questionTextResult.rows) {
    questionTextMap[row.id] = row.question_text;
    questionOrder.push(row.id);
  }

  // ── Grade answers ─────────────────────────────────────────────────────────
  let correct_answers = 0;
  const gradedAnswers = answers.map(({ question_id, selected_option_id }) => {
    const is_correct = correctMap[question_id] === selected_option_id;
    if (is_correct) correct_answers++;
    return { question_id, selected_option_id: selected_option_id ?? null, is_correct };
  });

  const passed = correct_answers === total_questions;

  // ── Call DB function (handles attempt numbering + points + user total) ────
  const pointsResult = await query(
    `SELECT fn_award_quiz_points($1, $2, $3, $4, $5) AS points_earned`,
    [user_id, quiz_id, enrollment_id, correct_answers, total_questions],
  );

  const points_earned = Number(pointsResult.rows[0].points_earned);

  // ── Fetch the attempt row just created by fn_award_quiz_points ────────────
  const attemptResult = await query(
    `SELECT id, attempt_number
     FROM quiz_attempts
     WHERE user_id = $1 AND quiz_id = $2
     ORDER BY attempted_at DESC
     LIMIT 1`,
    [user_id, quiz_id],
  );

  const { id: attempt_id, attempt_number } = attemptResult.rows[0];

  // ── Persist per-question answers ──────────────────────────────────────────
  await Promise.all(
    gradedAnswers.map(({ question_id, selected_option_id, is_correct }) =>
      query(
        `INSERT INTO quiz_attempt_answers
           (attempt_id, question_id, selected_option_id, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attempt_id, question_id, selected_option_id, is_correct],
      ),
    ),
  );

  // ── Fetch updated total_points after fn_award_quiz_points ran ────────────
  const userResult = await query(
    `SELECT total_points FROM users WHERE id = $1`,
    [user_id],
  );

  const updated_total_points = Number(userResult.rows[0].total_points);

  // ── Build per-question report ─────────────────────────────────────────────
  const gradedMap = {};
  for (const g of gradedAnswers) gradedMap[g.question_id] = g;

  const report = questionOrder.map((qid) => {
    const graded = gradedMap[qid] ?? null;
    return {
      question_id: qid,
      question_text: questionTextMap[qid],
      selected_option_id: graded?.selected_option_id ?? null,
      selected_option_text: graded?.selected_option_id
        ? (optionTextMap[graded.selected_option_id] ?? null)
        : null,
      correct_option_id: correctMap[qid] ?? null,
      correct_option_text: correctMap[qid]
        ? (optionTextMap[correctMap[qid]] ?? null)
        : null,
      is_correct: graded?.is_correct ?? false,
      options: optionsByQuestion[qid] ?? [],
    };
  });

  res.json({
    points_earned,
    passed,
    correct_answers,
    total_questions,
    attempt_number,
    updated_total_points,
    report,
  });
});

export default router;
