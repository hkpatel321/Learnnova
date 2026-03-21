import { Router } from 'express';
import { query } from '../db.js';
import { authOptional, authRequired } from '../middleware/auth.js';

const router = Router();

// ── GET /api/courses ──────────────────────────────────────────────────────────
// Returns published courses with avg rating.
// Visibility rules:
//   no token  → visibility = 'everyone' only
//   with token → 'everyone' + 'signed_in'
// Optional ?search= filters title ILIKE %search%
// If authenticated, each course includes the caller's enrollment_status.
router.get('/', authOptional, async (req, res) => {
  const { search } = req.query;

  const conditions = ["c.is_published = TRUE"];
  const params = [];

  // Visibility gate
  if (!req.user) {
    conditions.push(`c.visibility = 'everyone'`);
  } else {
    conditions.push(`c.visibility IN ('everyone', 'signed_in')`);
  }

  // Search filter
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`c.title ILIKE $${params.length}`);
  }

  const where = conditions.join(' AND ');

  // When authenticated, LEFT JOIN enrollments to surface enrollment_status.
  // User ID is passed as a query parameter — never interpolated.
  let enrollJoin = '';
  let enrollSelect = `, NULL::text AS enrollment_status`;

  if (req.user) {
    params.push(req.user.id);
    enrollJoin = `LEFT JOIN enrollments e
       ON e.course_id = c.id AND e.user_id = $${params.length}`;
    enrollSelect = `, e.status AS enrollment_status`;
  }

  const result = await query(
    `SELECT
       c.id,
       c.title,
       c.short_desc,
       c.cover_image_url,
       c.tags,
       c.access_rule,
       c.price,
       c.views_count,
       COALESCE(vr.avg_rating, 0)   AS avg_rating,
       COALESCE(vr.review_count, 0) AS review_count
       ${enrollSelect}
     FROM courses c
     LEFT JOIN vw_course_ratings vr ON vr.course_id = c.id
     ${enrollJoin}
     WHERE ${where}
     ORDER BY c.published_at DESC`,
    params,
  );

  res.json({ courses: result.rows });
});

// ── GET /api/courses/:id ──────────────────────────────────────────────────────
// Full course detail + nested lessons, quizzes.
// If authenticated: includes enrollment record + lesson_progress array.
// Always increments views_count.
router.get('/:id', authOptional, async (req, res) => {
  const { id } = req.params;

  // ── Course row ────────────────────────────────────────────────────────────
  const courseResult = await query(
    `SELECT
       c.*,
       u.name       AS instructor_name,
       u.avatar_url AS instructor_avatar,
       COALESCE(vr.avg_rating, 0)   AS avg_rating,
       COALESCE(vr.review_count, 0) AS review_count
     FROM courses c
     LEFT JOIN users             u  ON u.id  = c.responsible_id
     LEFT JOIN vw_course_ratings vr ON vr.course_id = c.id
     WHERE c.id = $1 AND c.is_published = TRUE`,
    [id],
  );

  if (courseResult.rowCount === 0) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const course = courseResult.rows[0];

  // Visibility gate for guests
  if (!req.user && course.visibility !== 'everyone') {
    return res.status(401).json({ error: 'Please log in to view this course.' });
  }

  // ── Lessons (sorted) ──────────────────────────────────────────────────────
  const lessonsResult = await query(
    `SELECT id, title, lesson_type, description, duration_mins, sort_order, allow_download
     FROM lessons
     WHERE course_id = $1
     ORDER BY sort_order ASC`,
    [id],
  );

  // ── Quizzes for this course ───────────────────────────────────────────────
  const quizzesResult = await query(
    `SELECT id, title, lesson_id
     FROM quizzes
     WHERE course_id = $1`,
    [id],
  );

  // ── Auth-only data ─────────────────────────────────────────────────────────
  let enrollment = null;
  let lesson_progress = [];

  if (req.user) {
    // Enrollment record
    const enrResult = await query(
      `SELECT id, status, enrolled_at, started_at, completed_at, is_paid
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2`,
      [req.user.id, id],
    );
    enrollment = enrResult.rows[0] ?? null;

    // Lesson progress — one row per lesson (only for lessons in this course)
    if (enrollment) {
      const progressResult = await query(
        `SELECT lp.lesson_id, lp.is_completed
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = $1 AND l.course_id = $2`,
        [req.user.id, id],
      );
      lesson_progress = progressResult.rows;
    }
  }

  // ── Increment views_count (fire-and-forget) ───────────────────────────────
  query('UPDATE courses SET views_count = views_count + 1 WHERE id = $1', [id]).catch(() => {});

  res.json({
    course,
    lessons: lessonsResult.rows,
    quizzes: quizzesResult.rows,
    enrollment,
    lesson_progress,
  });
});

// ── POST /api/courses/:id/enroll ──────────────────────────────────────────────
// Enroll the authenticated learner in a course.
// access_rule enforcement:
//   open        → enroll directly
//   invitation  → check course_invitations for caller's email (status='accepted')
//   payment     → return 402 with price, never enroll here
router.post('/:id/enroll', authRequired, async (req, res) => {
  const { id: course_id } = req.params;
  const user_id = req.user.id;

  // ── Verify course exists and is published ─────────────────────────────────
  const courseResult = await query(
    `SELECT id, access_rule, price FROM courses WHERE id = $1 AND is_published = TRUE`,
    [course_id],
  );

  if (courseResult.rowCount === 0) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const { access_rule, price } = courseResult.rows[0];

  // ── Access rule checks ────────────────────────────────────────────────────
  if (access_rule === 'payment') {
    return res.status(402).json({
      error: 'Payment required to enroll in this course.',
      price,
    });
  }

  if (access_rule === 'invitation') {
    // Caller's email must appear in course_invitations with status = 'accepted'
    const inviteResult = await query(
      `SELECT id FROM course_invitations
       WHERE course_id = $1
         AND email = (SELECT email FROM users WHERE id = $2)
         AND status = 'accepted'`,
      [course_id, user_id],
    );

    if (inviteResult.rowCount === 0) {
      return res.status(403).json({
        error: 'This course is by invitation only. Please contact the instructor.',
      });
    }
  }

  // ── Insert enrollment ─────────────────────────────────────────────────────
  try {
    const result = await query(
      `INSERT INTO enrollments (user_id, course_id, status)
       VALUES ($1, $2, 'not_started')
       RETURNING id, user_id, course_id, status, enrolled_at`,
      [user_id, course_id],
    );

    res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    // unique_violation → already enrolled
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You are already enrolled in this course.' });
    }
    throw err;
  }
});

export default router;
