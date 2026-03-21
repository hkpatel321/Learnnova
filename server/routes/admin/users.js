import { Router } from 'express';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// Base: auth + admin or instructor
router.use(authRequired, requireRole('admin', 'instructor'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// List assignable users (admin + instructor roles) for responsible dropdowns.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;

    const conditions = [`role IN ('admin', 'instructor')`];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT id, name, email, avatar_url, role
       FROM users
       ${where}
       ORDER BY name ASC`,
      params,
    );

    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/stats
// Platform-level stats — admin only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin'), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users)                                    AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE role = 'learner')             AS total_learners,
        (SELECT COUNT(*)::int FROM users WHERE role = 'instructor')          AS total_instructors,
        (SELECT COUNT(*)::int FROM courses)                                  AS total_courses,
        (SELECT COUNT(*)::int FROM courses WHERE is_published = TRUE)        AS published_courses,
        (SELECT COUNT(*)::int FROM enrollments)                              AS total_enrollments
    `);

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
