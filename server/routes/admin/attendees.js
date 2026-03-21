import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../../db.js';
import { authRequired } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roleCheck.js';

const router = Router();

// All routes require auth + admin or instructor role
router.use(authRequired, requireRole('admin', 'instructor'));

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/attendees/courses/:courseId/attendees
// List all enrollments for a course with user data + completion %.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/courses/:courseId/attendees', async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const check = await verifyCourseOwnership(courseId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `SELECT
         e.id              AS enrollment_id,
         e.user_id,
         u.name            AS user_name,
         u.email           AS user_email,
         u.avatar_url      AS user_avatar_url,
         e.status,
         e.enrolled_at,
         COALESCE(cp.completion_pct, 0) AS completion_pct
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN vw_course_progress cp ON cp.enrollment_id = e.id
       WHERE e.course_id = $1
       ORDER BY e.enrolled_at DESC`,
      [courseId],
    );

    res.json({ attendees: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/attendees/courses/:courseId/invite
// Invite learners by email. Auto-enroll if user already exists.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/courses/:courseId/invite', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'emails must be a non-empty array.' });
    }

    const check = await verifyCourseOwnership(courseId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const invited = [];
    const skipped = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      // Check if already invited with pending or accepted status
      const existingInvite = await query(
        `SELECT id, status FROM course_invitations
         WHERE course_id = $1 AND email = $2`,
        [courseId, email],
      );

      if (
        existingInvite.rowCount > 0 &&
        ['pending', 'accepted'].includes(existingInvite.rows[0].status)
      ) {
        skipped.push(email);
        continue;
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');

      // Check if user exists
      const userResult = await query(
        `SELECT id FROM users WHERE email = $1`,
        [email],
      );
      const existingUserId = userResult.rows[0]?.id ?? null;

      // Upsert invitation (handle case where expired invitation exists)
      if (existingInvite.rowCount > 0) {
        // Update existing expired invitation
        await query(
          `UPDATE course_invitations
           SET token = $1, status = 'pending', user_id = $2,
               invited_by = $3, invited_at = NOW(),
               expires_at = NOW() + INTERVAL '7 days',
               accepted_at = NULL
           WHERE course_id = $4 AND email = $5`,
          [token, existingUserId, req.user.id, courseId, email],
        );
      } else {
        // Insert new invitation
        await query(
          `INSERT INTO course_invitations
             (course_id, invited_by, email, user_id, token, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '7 days')`,
          [courseId, req.user.id, email, existingUserId, token],
        );
      }

      // If user exists, also auto-enroll them
      if (existingUserId) {
        await query(
          `INSERT INTO enrollments (user_id, course_id, status)
           VALUES ($1, $2, 'not_started')
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [existingUserId, courseId],
        );
      }

      invited.push(email);
    }

    res.json({ invited, skipped });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/attendees/courses/:courseId/attendees/:enrollmentId
// Remove a learner from a course by deleting their enrollment.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/courses/:courseId/attendees/:enrollmentId', async (req, res, next) => {
  try {
    const { courseId, enrollmentId } = req.params;

    const check = await verifyCourseOwnership(courseId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `DELETE FROM enrollments WHERE id = $1 AND course_id = $2 RETURNING id`,
      [enrollmentId, courseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Enrollment not found for this course.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/attendees/courses/:courseId/contact
// Stub: log email data and return success. Replace with real email service.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/courses/:courseId/contact', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { subject, message, recipient_ids } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required.' });
    }
    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return res.status(400).json({ error: 'recipient_ids must be a non-empty array.' });
    }

    const check = await verifyCourseOwnership(courseId, req.user);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    // Fetch recipient emails for logging
    const recipientResult = await query(
      `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
      [recipient_ids],
    );

    // Stub: log the email data
    console.log('[Email Stub] Contact attendees:', {
      courseId,
      sentBy: req.user.id,
      subject: subject.trim(),
      message: message.trim(),
      recipients: recipientResult.rows.map(r => ({ id: r.id, name: r.name, email: r.email })),
    });

    res.json({ success: true, message: 'Emails queued (stub)' });
  } catch (err) {
    next(err);
  }
});

export default router;
