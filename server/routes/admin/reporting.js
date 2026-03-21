import { Router } from 'express';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// All routes require auth + admin or instructor role
router.use(authRequired, requireRole('admin', 'instructor'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reporting
// Paginated reporting with overview counts and optional filters.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const {
      status,
      course_id,
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset   = (pageNum - 1) * limitNum;

    // ── Build shared WHERE clause ────────────────────────────────────────
    const conditions = [];
    const params = [];

    // Instructor scoping: only their courses
    if (!isAdmin) {
      params.push(req.user.id);
      conditions.push(`c.responsible_id = $${params.length}`);
    }

    // Filter by status
    if (status && ['not_started', 'in_progress', 'completed'].includes(status)) {
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    // Filter by course
    if (course_id) {
      params.push(course_id);
      conditions.push(`e.course_id = $${params.length}`);
    }

    // Search by name or email
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // ── Base FROM / JOIN clause (same logic as vw_reporting) ─────────────
    const fromClause = `
      FROM enrollments e
      JOIN users   u  ON u.id = e.user_id
      JOIN courses c  ON c.id = e.course_id
      LEFT JOIN vw_course_progress cp ON cp.enrollment_id = e.id
    `;

    // ── Overview counts ──────────────────────────────────────────────────
    // We need counts with the same instructor/course scoping but WITHOUT
    // status filter so each bucket is independent.
    const countConditions = conditions.filter((_, i) => {
      // Remove the status condition (if present) from count query
      // status condition was added when status param exists
      if (status && ['not_started', 'in_progress', 'completed'].includes(status)) {
        // Find which condition index corresponds to status
        const statusParamIdx = (() => {
          let idx = isAdmin ? 0 : 1;
          return idx; // status is always the first filter after instructor scoping
        })();
        return i !== statusParamIdx;
      }
      return true;
    });

    // Simpler approach: build count conditions separately (without status)
    const countConds = [];
    const countParams = [];

    if (!isAdmin) {
      countParams.push(req.user.id);
      countConds.push(`c.responsible_id = $${countParams.length}`);
    }
    if (course_id) {
      countParams.push(course_id);
      countConds.push(`e.course_id = $${countParams.length}`);
    }
    if (search && search.trim()) {
      countParams.push(`%${search.trim()}%`);
      const idx = countParams.length;
      countConds.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    }

    const countWhere = countConds.length > 0
      ? `WHERE ${countConds.join(' AND ')}`
      : '';

    const overviewResult = await query(
      `SELECT
         COUNT(*)::int                                              AS total_participants,
         COUNT(*) FILTER (WHERE e.status = 'not_started')::int     AS yet_to_start,
         COUNT(*) FILTER (WHERE e.status = 'in_progress')::int     AS in_progress,
         COUNT(*) FILTER (WHERE e.status = 'completed')::int       AS completed
       ${fromClause}
       ${countWhere}`,
      countParams,
    );

    const overview = overviewResult.rows[0];

    // ── Total count for pagination (WITH status filter) ──────────────────
    const totalResult = await query(
      `SELECT COUNT(*)::int AS total ${fromClause} ${where}`,
      params,
    );
    const totalRows  = totalResult.rows[0].total;
    const totalPages = Math.ceil(totalRows / limitNum);

    // ── Paginated rows ───────────────────────────────────────────────────
    const dataParams = [...params, limitNum, offset];
    const rowsResult = await query(
      `SELECT
         e.id              AS enrollment_id,
         e.course_id,
         c.title           AS course_name,
         u.name            AS participant_name,
         u.email           AS participant_email,
         e.enrolled_at,
         e.started_at,
         e.completed_at,
         e.time_spent_mins,
         e.status,
         COALESCE(cp.total_lessons, 0)     AS total_lessons,
         COALESCE(cp.completed_lessons, 0) AS completed_lessons,
         COALESCE(cp.completion_pct, 0)    AS completion_pct
       ${fromClause}
       ${where}
       ORDER BY e.enrolled_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    res.json({
      overview,
      rows: rowsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_rows: totalRows,
        total_pages: totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reporting/courses
// Course list for filter dropdown. Scoped by role.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/courses', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let result;
    if (isAdmin) {
      result = await query(
        `SELECT id, title FROM courses ORDER BY title ASC`,
      );
    } else {
      result = await query(
        `SELECT id, title FROM courses
         WHERE responsible_id = $1
         ORDER BY title ASC`,
        [req.user.id],
      );
    }

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
