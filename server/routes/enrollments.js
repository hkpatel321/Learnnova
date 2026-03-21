import { Router } from 'express';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

// ── GET /api/enrollments/me ───────────────────────────────────────────────────
// Returns all enrolled courses for the current learner with progress data.
// Uses vw_course_progress (already joins enrollments + lessons + lesson_progress).
router.get('/me', async (req, res) => {
  const user_id = req.user.id;

  const result = await query(
    `SELECT
       cp.enrollment_id,
       cp.course_id,
       c.title          AS course_title,
       c.cover_image_url,
       c.short_desc,
       c.tags,
       cp.status,
       cp.completion_pct,
       cp.total_lessons,
       cp.completed_lessons,
       cp.time_spent_mins,
       e.enrolled_at,
       e.started_at,
       e.completed_at
     FROM vw_course_progress cp
     JOIN courses     c ON c.id = cp.course_id
     JOIN enrollments e ON e.id = cp.enrollment_id
     WHERE cp.user_id = $1
     ORDER BY
       CASE cp.status
         WHEN 'in_progress' THEN 1
         WHEN 'not_started' THEN 2
         ELSE 3
       END,
       e.enrolled_at DESC`,
    [user_id],
  );

  res.json({ enrollments: result.rows });
});

// ── PUT /api/enrollments/:id/time ─────────────────────────────────────────────
// Accumulate time spent on a course.
// Body: { minutes_to_add }
// Only the owner of the enrollment may update it.
router.put('/:id/time', async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const { minutes_to_add } = req.body;

  if (!minutes_to_add || Number(minutes_to_add) <= 0) {
    return res.status(400).json({ error: 'minutes_to_add must be a positive number.' });
  }

  // Verify ownership before writing
  const ownerCheck = await query(
    `SELECT id FROM enrollments WHERE id = $1 AND user_id = $2`,
    [id, user_id],
  );

  if (ownerCheck.rowCount === 0) {
    return res.status(403).json({ error: 'Enrollment not found or access denied.' });
  }

  const result = await query(
    `UPDATE enrollments
     SET time_spent_mins = time_spent_mins + $1
     WHERE id = $2
     RETURNING time_spent_mins`,
    [Number(minutes_to_add), id],
  );

  res.json({ time_spent_mins: result.rows[0].time_spent_mins });
});

export default router;
