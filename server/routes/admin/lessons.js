import { Router } from 'express';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// All admin/lessons routes require auth + admin or instructor role
router.use(authRequired, requireRole('admin', 'instructor'));

const VALID_LESSON_TYPES = ['video', 'document', 'image', 'quiz'];

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

// ── Helper: verify lesson ownership (via its course) ─────────────────────────
async function verifyLessonOwnership(lessonId, user) {
  const result = await query(
    `SELECT l.id, l.course_id, c.responsible_id
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = $1`,
    [lessonId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, error: 'Lesson not found.' };
  const row = result.rows[0];
  if (user.role !== 'admin' && row.responsible_id !== user.id) {
    return { ok: false, status: 403, error: 'Forbidden: you do not own this course.' };
  }
  return { ok: true, lesson: row };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/lessons/:id
// Return lesson with all fields, attachments, and linked quiz.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyLessonOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Full lesson
    const lessonResult = await query(
      `SELECT * FROM lessons WHERE id = $1`,
      [id],
    );
    const lesson = lessonResult.rows[0];

    // Attachments
    const attResult = await query(
      `SELECT id, attachment_type, label, url, sort_order, created_at
       FROM lesson_attachments
       WHERE lesson_id = $1
       ORDER BY sort_order ASC`,
      [id],
    );

    // Linked quiz (if any)
    const quizResult = await query(
      `SELECT id, title FROM quizzes WHERE lesson_id = $1`,
      [id],
    );

    res.json({
      lesson: {
        ...lesson,
        attachments: attResult.rows,
        quiz: quizResult.rows[0] ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/lessons
// Create a new lesson. Auto-assigns sort_order if not provided.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      course_id, title, lesson_type,
      description,
      video_url, duration_mins,
      file_url, allow_download,
      responsible_id,
      sort_order,
    } = req.body;

    // ── Validate required fields ─────────────────────────────────────────
    if (!course_id) return res.status(400).json({ error: 'course_id is required.' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required.' });
    if (!lesson_type) return res.status(400).json({ error: 'lesson_type is required.' });
    if (!VALID_LESSON_TYPES.includes(lesson_type)) {
      return res.status(400).json({
        error: `lesson_type must be one of: ${VALID_LESSON_TYPES.join(', ')}`,
      });
    }

    // ── Verify course ownership ──────────────────────────────────────────
    const check = await verifyCourseOwnership(course_id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // ── Auto sort_order if not provided ──────────────────────────────────
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) AS max_order
         FROM lessons WHERE course_id = $1`,
        [course_id],
      );
      finalSortOrder = maxResult.rows[0].max_order + 1;
    }

    const result = await query(
      `INSERT INTO lessons
         (course_id, title, lesson_type, description,
          video_url, duration_mins, file_url, allow_download,
          responsible_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        course_id,
        title.trim(),
        lesson_type,
        description ?? null,
        video_url ?? null,
        duration_mins ?? null,
        file_url ?? null,
        allow_download ?? false,
        responsible_id ?? req.user.id,
        finalSortOrder,
      ],
    );

    res.status(201).json({ lesson: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/lessons/:id
// Update any subset of lesson fields.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyLessonOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const allowed = [
      'title', 'lesson_type', 'description',
      'video_url', 'duration_mins',
      'file_url', 'allow_download',
      'responsible_id', 'sort_order',
    ];

    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Validate lesson_type if being changed
        if (key === 'lesson_type' && !VALID_LESSON_TYPES.includes(req.body[key])) {
          return res.status(400).json({
            error: `lesson_type must be one of: ${VALID_LESSON_TYPES.join(', ')}`,
          });
        }
        params.push(req.body[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    params.push(id);
    const result = await query(
      `UPDATE lessons SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING *`,
      params,
    );

    res.json({ lesson: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/lessons/:id
// Hard delete. CASCADE removes attachments and progress.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const check = await verifyLessonOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    await query(`DELETE FROM lessons WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/lessons/:id/reorder
// Update sort_order for a single lesson.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/reorder', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sort_order } = req.body;

    if (sort_order === undefined || sort_order === null) {
      return res.status(400).json({ error: 'sort_order is required.' });
    }

    const check = await verifyLessonOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `UPDATE lessons SET sort_order = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [sort_order, id],
    );

    res.json({ lesson: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/lessons/:id/attachments
// Add an attachment (file or link) to a lesson.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/attachments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attachment_type, label, url } = req.body;

    // Validate
    if (!attachment_type || !['file', 'link'].includes(attachment_type)) {
      return res.status(400).json({ error: 'attachment_type must be "file" or "link".' });
    }
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'label is required.' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'url is required.' });
    }

    const check = await verifyLessonOwnership(id, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Auto sort_order
    const maxResult = await query(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_order
       FROM lesson_attachments WHERE lesson_id = $1`,
      [id],
    );
    const sortOrder = maxResult.rows[0].max_order + 1;

    const result = await query(
      `INSERT INTO lesson_attachments (lesson_id, attachment_type, label, url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, attachment_type, label.trim(), url.trim(), sortOrder],
    );

    res.status(201).json({ attachment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/lessons/:lessonId/attachments/:attachmentId
// Remove a specific attachment. Verifies it belongs to the lesson.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:lessonId/attachments/:attachmentId', async (req, res, next) => {
  try {
    const { lessonId, attachmentId } = req.params;

    const check = await verifyLessonOwnership(lessonId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `DELETE FROM lesson_attachments
       WHERE id = $1 AND lesson_id = $2
       RETURNING id`,
      [attachmentId, lessonId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Attachment not found for this lesson.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
