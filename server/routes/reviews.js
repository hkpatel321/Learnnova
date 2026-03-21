import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, authOptional } from '../middleware/auth.js';

const router = Router({ mergeParams: true }); // receives :id from /api/courses/:id/reviews

// ── GET /api/courses/:id/reviews ─────────────────────────────────────────────
// Public — list all reviews for a course with reviewer info and summary stats.
router.get('/', authOptional, async (req, res) => {
  const { id: course_id } = req.params;

  const [reviewsResult, summaryResult] = await Promise.all([
    query(
      `SELECT
         r.id,
         r.rating,
         r.review_text,
         r.created_at,
         u.id         AS user_id,
         u.name       AS user_name,
         u.avatar_url AS user_avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.course_id = $1
       ORDER BY r.created_at DESC`,
      [course_id],
    ),
    query(
      `SELECT avg_rating, review_count
       FROM vw_course_ratings
       WHERE course_id = $1`,
      [course_id],
    ),
  ]);

  res.json({
    summary: summaryResult.rows[0] ?? { avg_rating: 0, review_count: 0 },
    reviews: reviewsResult.rows,
  });
});

// ── POST /api/courses/:id/reviews ─────────────────────────────────────────────
// Create a new review. Returns 409 if the user has already reviewed this course.
router.post('/', authRequired, async (req, res) => {
  const { id: course_id } = req.params;
  const user_id = req.user.id;
  const { rating, review_text } = req.body;

  // Validate rating
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
  }

  // Verify enrollment
  const enrollResult = await query(
    `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2`,
    [user_id, course_id],
  );

  if (enrollResult.rowCount === 0) {
    return res.status(403).json({
      error: 'You must be enrolled in this course to leave a review.',
    });
  }

  // Strict insert — 409 on duplicate (unique constraint: user_id + course_id)
  try {
    const result = await query(
      `INSERT INTO reviews (user_id, course_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, review_text, created_at`,
      [user_id, course_id, ratingNum, review_text ?? null],
    );

    // Fetch reviewer info to return in the response
    const userResult = await query(
      `SELECT name AS user_name, avatar_url AS user_avatar_url
       FROM users WHERE id = $1`,
      [user_id],
    );

    res.status(201).json({
      review: { ...result.rows[0], ...userResult.rows[0] },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'You have already reviewed this course. Use PUT to update your review.',
      });
    }
    throw err;
  }
});

// ── PUT /api/courses/:id/reviews ──────────────────────────────────────────────
// Update the authenticated user's existing review for this course.
router.put('/', authRequired, async (req, res) => {
  const { id: course_id } = req.params;
  const user_id = req.user.id;
  const { rating, review_text } = req.body;

  // Validate rating
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
  }

  // Find the existing review
  const existing = await query(
    `SELECT id FROM reviews WHERE user_id = $1 AND course_id = $2`,
    [user_id, course_id],
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({
      error: 'No review found for this course. Use POST to create one.',
    });
  }

  const result = await query(
    `UPDATE reviews
     SET rating      = $1,
         review_text = $2,
         updated_at  = NOW()
     WHERE user_id = $3 AND course_id = $4
     RETURNING id, rating, review_text, created_at, updated_at`,
    [ratingNum, review_text ?? null, user_id, course_id],
  );

  res.json({ review: result.rows[0] });
});

export default router;
