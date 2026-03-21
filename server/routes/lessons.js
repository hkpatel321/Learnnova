import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

// ── GET /api/lessons/:id/content ─────────────────────────────────────────────
// Full lesson content for an enrolled learner.
// Returns: lesson columns, attachments[], quiz (if linked), is_completed.
router.get('/:id/content', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  // ── Fetch lesson + verify enrollment in one query ─────────────────────────
  // JOIN through lessons → courses → enrollments so we can 403 in one round-trip.
  const lessonResult = await query(
    `SELECT
       l.id,
       l.title,
       l.lesson_type,
       l.description,
       l.video_url,
       l.file_url,
       l.allow_download,
       l.duration_mins,
       l.sort_order,
       l.course_id,
       e.id     AS enrollment_id,
       e.status AS enrollment_status
     FROM lessons l
     JOIN courses     c ON c.id = l.course_id
     LEFT JOIN enrollments e
       ON e.course_id = c.id AND e.user_id = $2
     WHERE l.id = $1`,
    [id, user_id],
  );

  if (lessonResult.rowCount === 0) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  const row = lessonResult.rows[0];

  if (!row.enrollment_id) {
    return res.status(403).json({ error: 'You are not enrolled in this course.' });
  }

  // ── Build clean lesson object (drop join columns) ─────────────────────────
  const lesson = {
    id:            row.id,
    title:         row.title,
    lesson_type:   row.lesson_type,
    description:   row.description,
    video_url:     row.video_url,
    file_url:      row.file_url,
    allow_download: row.allow_download,
    duration_mins: row.duration_mins,
    sort_order:    row.sort_order,
  };

  // ── Fetch attachments, quiz, and progress in parallel ─────────────────────
  const [attachResult, quizResult, progressResult] = await Promise.all([
    // Attachments sorted by sort_order
    query(
      `SELECT id, attachment_type, label, url
       FROM lesson_attachments
       WHERE lesson_id = $1
       ORDER BY sort_order ASC`,
      [id],
    ),
    // Associated quiz (any lesson_type can have a linked quiz)
    query(
      `SELECT id, title
       FROM quizzes
       WHERE lesson_id = $1
       LIMIT 1`,
      [id],
    ),
    // Completion flag for this learner
    query(
      `SELECT is_completed
       FROM lesson_progress
       WHERE user_id = $1 AND lesson_id = $2`,
      [user_id, id],
    ),
  ]);

  res.json({
    lesson,
    attachments:   attachResult.rows,
    quiz:          quizResult.rows[0] ?? null,
    is_completed:  progressResult.rows[0]?.is_completed ?? false,
  });
});

// ── POST /api/lessons/:id/complete ───────────────────────────────────────────
// Mark a lesson complete via fn_complete_lesson, return updated progress.
// Body: { enrollment_id }
router.post('/:id/complete', async (req, res) => {
  const { id: lesson_id } = req.params;
  const user_id = req.user.id;
  const { enrollment_id } = req.body;

  if (!enrollment_id) {
    return res.status(400).json({ error: 'enrollment_id is required.' });
  }

  // Verify the enrollment belongs to this user
  const ownerCheck = await query(
    `SELECT id, course_id FROM enrollments
     WHERE id = $1 AND user_id = $2`,
    [enrollment_id, user_id],
  );

  if (ownerCheck.rowCount === 0) {
    return res.status(403).json({ error: 'Enrollment not found or access denied.' });
  }

  // Verify the lesson actually belongs to that enrollment's course
  const lessonCheck = await query(
    `SELECT id FROM lessons
     WHERE id = $1 AND course_id = $2`,
    [lesson_id, ownerCheck.rows[0].course_id],
  );

  if (lessonCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Lesson not found in this course.' });
  }

  // ⚡ Delegate all business logic to the DB function:
  //    - upserts lesson_progress
  //    - sets enrollment to in_progress / completed as appropriate
  await query(
    `SELECT fn_complete_lesson($1, $2, $3)`,
    [user_id, lesson_id, enrollment_id],
  );

  // Fetch updated completion_pct & enrollment status from view
  const progressResult = await query(
    `SELECT
       cp.completion_pct,
       cp.status AS enrollment_status
     FROM vw_course_progress cp
     WHERE cp.enrollment_id = $1`,
    [enrollment_id],
  );

  const { completion_pct, enrollment_status } = progressResult.rows[0];

  res.json({
    success: true,
    completion_pct,
    enrollment_status,
  });
});

export default router;
