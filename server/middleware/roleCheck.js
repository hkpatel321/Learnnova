/**
 * Role-based access control middleware.
 *
 * Usage:
 *   requireRole('admin')                  → admin only
 *   requireRole('admin', 'instructor')   → admin or instructor
 *
 * Must be placed AFTER authRequired so that req.user is populated.
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Gracefully handle older JWTs that might not have the 'role' claim
    if (!req.user.role) {
      try {
        const { query } = await import('../db.js');
        const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rowCount > 0) {
          req.user.role = result.rows[0].role;
        }
      } catch (err) {
        console.error('Failed to fetch role for old token:', err);
      }
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}
