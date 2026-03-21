import { Router } from 'express';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// All admin/courses routes require auth + admin or instructor role
router.use(authRequired, requireRole('admin', 'instructor'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/courses
// List all courses with lesson stats. Instructors see only their own courses.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const isAdmin = req.user.role === 'admin';

    const conditions = [];
    const params = [];

    // Instructors can only see their own courses
    if (!isAdmin) {
      params.push(req.user.id);
      conditions.push(`c.responsible_id = $${params.length}`);
    }

    // Optional title search
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`c.title ILIKE $${params.length}`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT
         c.id, c.title, c.tags, c.cover_image_url,
         c.is_published, c.published_at, c.visibility,
         c.access_rule, c.price, c.views_count,
         c.created_at, c.updated_at,
         COUNT(l.id)::int                          AS lessons_count,
         COALESCE(SUM(l.duration_mins), 0)::int    AS total_duration_mins,
         json_build_object(
           'id',    u.id,
           'name',  u.name,
           'email', u.email
         ) AS responsible
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN users  u ON u.id = c.responsible_id
       ${where}
       GROUP BY c.id, u.id
       ORDER BY c.created_at DESC`,
      params,
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/courses/:id
// Full course detail with lessons, quizzes, ratings, enrollment count.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // ── Fetch course ──────────────────────────────────────────────────────
    const courseResult = await query(
      `SELECT c.*,
              json_build_object(
                'id',    u.id,
                'name',  u.name,
                'email', u.email
              ) AS responsible
       FROM courses c
       LEFT JOIN users u ON u.id = c.responsible_id
       WHERE c.id = $1`,
      [id],
    );

    if (courseResult.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = courseResult.rows[0];

    // Instructor can only view their own courses
    if (!isAdmin && course.responsible_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this course.' });
    }

    // ── Lessons with nested attachments ───────────────────────────────────
    const lessonsResult = await query(
      `SELECT id, title, lesson_type, description, video_url,
              duration_mins, file_url, allow_download, sort_order,
              responsible_id, created_at, updated_at
       FROM lessons
       WHERE course_id = $1
       ORDER BY sort_order ASC`,
      [id],
    );

    const lessonIds = lessonsResult.rows.map(l => l.id);
    let attachmentRows = [];
    if (lessonIds.length > 0) {
      const attResult = await query(
        `SELECT id, lesson_id, attachment_type, label, url, sort_order, created_at
         FROM lesson_attachments
         WHERE lesson_id = ANY($1::uuid[])
         ORDER BY lesson_id, sort_order ASC`,
        [lessonIds],
      );
      attachmentRows = attResult.rows;
    }

    const lessons = lessonsResult.rows.map(l => ({
      ...l,
      attachments: attachmentRows.filter(a => a.lesson_id === l.id),
    }));

    // ── Quizzes with nested questions and options ─────────────────────────
    const quizzesResult = await query(
      `SELECT id, lesson_id, title,
              points_attempt_1, points_attempt_2,
              points_attempt_3, points_attempt_4plus,
              created_at, updated_at
       FROM quizzes
       WHERE course_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    const quizIds = quizzesResult.rows.map(q => q.id);
    let questionRows = [];
    let optionRows = [];

    if (quizIds.length > 0) {
      const qResult = await query(
        `SELECT id, quiz_id, question_text, sort_order, created_at
         FROM quiz_questions
         WHERE quiz_id = ANY($1::uuid[])
         ORDER BY quiz_id, sort_order ASC`,
        [quizIds],
      );
      questionRows = qResult.rows;

      const questionIds = questionRows.map(q => q.id);
      if (questionIds.length > 0) {
        const oResult = await query(
          `SELECT id, question_id, option_text, is_correct, sort_order
           FROM quiz_options
           WHERE question_id = ANY($1::uuid[])
           ORDER BY question_id, sort_order ASC`,
          [questionIds],
        );
        optionRows = oResult.rows;
      }
    }

    const quizzes = quizzesResult.rows.map(quiz => ({
      ...quiz,
      questions: questionRows
        .filter(q => q.quiz_id === quiz.id)
        .map(q => ({
          ...q,
          options: optionRows.filter(o => o.question_id === q.id),
        })),
    }));

    // ── Enrollment count ─────────────────────────────────────────────────
    const enrollResult = await query(
      `SELECT COUNT(*)::int AS enrollment_count
       FROM enrollments WHERE course_id = $1`,
      [id],
    );
    const enrollment_count = enrollResult.rows[0].enrollment_count;

    // ── Average rating from view ─────────────────────────────────────────
    const ratingResult = await query(
      `SELECT review_count, avg_rating
       FROM vw_course_ratings WHERE course_id = $1`,
      [id],
    );
    const ratings = ratingResult.rows[0] ?? { review_count: 0, avg_rating: null };

    res.json({
      course: {
        ...course,
        lessons,
        quizzes,
        enrollment_count,
        review_count: Number(ratings.review_count),
        avg_rating: ratings.avg_rating ? Number(ratings.avg_rating) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/courses
// Quick-create with only a title (draft, unpublished).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required.' });
    }

    const result = await query(
      `INSERT INTO courses (title, responsible_id, is_published)
       VALUES ($1, $2, FALSE)
       RETURNING *`,
      [title.trim(), req.user.id],
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/courses/:id
// Update course fields. Instructors can only edit their own courses.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Verify course exists and ownership
    const existing = await query(`SELECT responsible_id FROM courses WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isAdmin && existing.rows[0].responsible_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this course.' });
    }

    const allowed = [
      'title', 'short_desc', 'description', 'cover_image_url',
      'tags', 'website_url', 'visibility', 'access_rule', 'price',
    ];

    // Admin can also change responsible_id
    if (isAdmin) allowed.push('responsible_id');

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

    // Validate payment rule
    const newAccessRule = req.body.access_rule;
    const newPrice = req.body.price;
    if (newAccessRule === 'payment' && (newPrice === undefined || newPrice === null)) {
      // Check if price is already set on the existing course
      const priceCheck = await query(`SELECT price FROM courses WHERE id = $1`, [id]);
      if (!priceCheck.rows[0].price && newPrice === undefined) {
        return res.status(400).json({
          error: 'price is required when access_rule is "payment".',
        });
      }
    }


    params.push(id);
    const result = await query(
      `UPDATE courses SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING *`,
      params,
    );

    res.json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/courses/:id/publish
// Toggle publish state. Requires website_url when publishing.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publish } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (typeof publish !== 'boolean') {
      return res.status(400).json({ error: 'publish must be a boolean.' });
    }

    // Verify course exists and ownership
    const existing = await query(
      `SELECT responsible_id FROM courses WHERE id = $1`,
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isAdmin && existing.rows[0].responsible_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this course.' });
    }

    const result = await query(
      `UPDATE courses
       SET is_published  = $1,
           published_at  = ${publish ? 'NOW()' : 'NULL'},
           updated_at    = NOW()
       WHERE id = $2
       RETURNING is_published, published_at`,
      [publish, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/courses/:id
// Hard delete — instructor owns, admin can delete any. CASCADE handles related records.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership if not admin
    if (!isAdmin) {
      const existing = await query(`SELECT responsible_id FROM courses WHERE id = $1`, [id]);
      if (existing.rowCount === 0) {
        return res.status(404).json({ error: 'Course not found.' });
      }
      if (existing.rows[0].responsible_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: you do not own this course.' });
      }
    }

    const result = await query(`DELETE FROM courses WHERE id = $1 RETURNING id`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/courses/:id/share-link
// Generate a shareable learner URL.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/share-link', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Verify course exists and ownership
    const existing = await query(`SELECT responsible_id FROM courses WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (!isAdmin && existing.rows[0].responsible_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this course.' });
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    res.json({ url: `${baseUrl}/courses/${id}` });
  } catch (err) {
    next(err);
  }
});

export default router;
