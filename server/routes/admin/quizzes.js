import { Router } from 'express';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// All routes require auth + admin or instructor role
router.use(authRequired, requireRole('admin', 'instructor'));

// ── Helper: verify quiz ownership via its course ─────────────────────────────
async function verifyQuizOwnership(quizId, user) {
  const result = await query(
    `SELECT q.id, q.course_id, c.responsible_id
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     WHERE q.id = $1`,
    [quizId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, error: 'Quiz not found.' };
  const row = result.rows[0];
  if (user.role !== 'admin' && row.responsible_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden: you do not own this course.' };
  }
  return { ok: true, quiz: row };
}

// ── Helper: verify course ownership ──────────────────────────────────────────
async function verifyCourseOwnership(courseId, user) {
  const result = await query(
    `SELECT responsible_id FROM courses WHERE id = $1`,
    [courseId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, error: 'Course not found.' };
  if (user.role !== 'admin' && result.rows[0].responsible_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden: you do not own this course.' };
  }
  return { ok: true };
}

// ── Helper: verify question ownership via quiz → course ──────────────────────
async function verifyQuestionOwnership(questionId, user) {
  const result = await query(
    `SELECT qq.id, qq.quiz_id, q.course_id, c.responsible_id
     FROM quiz_questions qq
     JOIN quizzes q ON q.id = qq.quiz_id
     JOIN courses c ON c.id = q.course_id
     WHERE qq.id = $1`,
    [questionId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, error: 'Question not found.' };
  const row = result.rows[0];
  if (user.role !== 'admin' && row.responsible_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden: you do not own this course.' };
  }
  return { ok: true, question: row };
}

// ── Helper: verify option ownership via question → quiz → course ─────────────
async function verifyOptionOwnership(optionId, user) {
  const result = await query(
    `SELECT qo.id, qo.question_id, qq.quiz_id, q.course_id, c.responsible_id
     FROM quiz_options qo
     JOIN quiz_questions qq ON qq.id = qo.question_id
     JOIN quizzes q ON q.id = qq.quiz_id
     JOIN courses c ON c.id = q.course_id
     WHERE qo.id = $1`,
    [optionId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, error: 'Option not found.' };
  const row = result.rows[0];
  if (user.role !== 'admin' && row.responsible_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden: you do not own this course.' };
  }
  return { ok: true, option: row };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/quizzes/:id
// Full quiz with nested questions → options (admin view includes is_correct).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyQuizOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Quiz
    const quizResult = await query(`SELECT * FROM quizzes WHERE id = $1`, [id]);
    const quiz = quizResult.rows[0];

    // Questions
    const questionsResult = await query(
      `SELECT id, question_text, sort_order, created_at
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY sort_order ASC`,
      [id],
    );

    // Options for all questions
    const questionIds = questionsResult.rows.map(q => q.id);
    let optionRows = [];
    if (questionIds.length > 0) {
      const optResult = await query(
        `SELECT id, question_id, option_text, is_correct, sort_order
         FROM quiz_options
         WHERE question_id = ANY($1::uuid[])
         ORDER BY question_id, sort_order ASC`,
        [questionIds],
      );
      optionRows = optResult.rows;
    }

    const questions = questionsResult.rows.map(q => ({
      ...q,
      options: optionRows.filter(o => o.question_id === q.id),
    }));

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        course_id: quiz.course_id,
        lesson_id: quiz.lesson_id,
        points_attempt_1: quiz.points_attempt_1,
        points_attempt_2: quiz.points_attempt_2,
        points_attempt_3: quiz.points_attempt_3,
        points_attempt_4plus: quiz.points_attempt_4plus,
        created_at: quiz.created_at,
        updated_at: quiz.updated_at,
        questions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/quizzes
// Create a new quiz linked to a course (and optionally a lesson).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      course_id, lesson_id, title,
      points_attempt_1  = 10,
      points_attempt_2  = 7,
      points_attempt_3  = 4,
      points_attempt_4plus = 2,
    } = req.body;

    if (!course_id) return res.status(400).json({ error: 'course_id is required.' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required.' });

    const check = await verifyCourseOwnership(course_id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `INSERT INTO quizzes
         (course_id, lesson_id, title,
          points_attempt_1, points_attempt_2,
          points_attempt_3, points_attempt_4plus)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        course_id,
        lesson_id ?? null,
        title.trim(),
        points_attempt_1,
        points_attempt_2,
        points_attempt_3,
        points_attempt_4plus,
      ],
    );

    res.status(201).json({ quiz: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/quizzes/:id
// Update quiz title and point config.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyQuizOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const allowed = [
      'title', 'lesson_id',
      'points_attempt_1', 'points_attempt_2',
      'points_attempt_3', 'points_attempt_4plus',
    ];

    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    params.push(id);
    const result = await query(
      `UPDATE quizzes SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING *`,
      params,
    );

    res.json({ quiz: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/quizzes/:id
// Hard delete quiz. CASCADE removes questions, options, attempts.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyQuizOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    await query(`DELETE FROM quizzes WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/quizzes/:id/questions
// Create question with options in one call.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/questions', async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { question_text, sort_order, options } = req.body;

    if (!question_text || !question_text.trim()) {
      return res.status(400).json({ error: 'question_text is required.' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'At least 2 options are required.' });
    }
    const correctCount = options.filter(o => o.is_correct).length;
    if (correctCount < 1) {
      return res.status(400).json({ error: 'At least one option must be marked is_correct.' });
    }

    const check = await verifyQuizOwnership(quizId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Auto sort_order
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) AS max_order
         FROM quiz_questions WHERE quiz_id = $1`,
        [quizId],
      );
      finalSortOrder = maxResult.rows[0].max_order + 1;
    }

    // Insert question
    const qResult = await query(
      `INSERT INTO quiz_questions (quiz_id, question_text, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [quizId, question_text.trim(), finalSortOrder],
    );
    const question = qResult.rows[0];

    // Insert options
    const insertedOptions = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const oResult = await query(
        `INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [question.id, opt.option_text, !!opt.is_correct, opt.sort_order ?? i + 1],
      );
      insertedOptions.push(oResult.rows[0]);
    }

    res.status(201).json({
      question: { ...question, options: insertedOptions },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/questions/:questionId
// Update question text or sort_order.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/questions/:questionId', async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const check = await verifyQuestionOwnership(questionId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const allowed = ['question_text', 'sort_order'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    params.push(questionId);
    const result = await query(
      `UPDATE quiz_questions SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params,
    );

    res.json({ question: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/questions/:questionId
// Delete question. CASCADE removes options + attempt_answers.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/questions/:questionId', async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const check = await verifyQuestionOwnership(questionId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    await query(`DELETE FROM quiz_questions WHERE id = $1`, [questionId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/questions/:questionId/options
// Add a single option to an existing question.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/questions/:questionId/options', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { option_text, is_correct, sort_order } = req.body;

    if (!option_text || !option_text.trim()) {
      return res.status(400).json({ error: 'option_text is required.' });
    }

    const check = await verifyQuestionOwnership(questionId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Auto sort_order
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) AS max_order
         FROM quiz_options WHERE question_id = $1`,
        [questionId],
      );
      finalSortOrder = maxResult.rows[0].max_order + 1;
    }

    const result = await query(
      `INSERT INTO quiz_options (question_id, option_text, is_correct, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [questionId, option_text.trim(), !!is_correct, finalSortOrder],
    );

    res.status(201).json({ option: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/options/:optionId
// Update option text, is_correct, or sort_order.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/options/:optionId', async (req, res, next) => {
  try {
    const { optionId } = req.params;

    const check = await verifyOptionOwnership(optionId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const allowed = ['option_text', 'is_correct', 'sort_order'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        params.push(req.body[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    params.push(optionId);
    const result = await query(
      `UPDATE quiz_options SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params,
    );

    res.json({ option: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/options/:optionId
// Delete a single option.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/options/:optionId', async (req, res, next) => {
  try {
    const { optionId } = req.params;

    const check = await verifyOptionOwnership(optionId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    await query(`DELETE FROM quiz_options WHERE id = $1`, [optionId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
