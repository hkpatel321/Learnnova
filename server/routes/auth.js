import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // Check duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'learner')
     RETURNING id, name, email, role, avatar_url, total_points`,
    [name.trim(), email.toLowerCase(), password_hash],
  );

  const user = result.rows[0];
  const token = signToken(user);

  res.status(201).json({ token, user });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const result = await query(
    `SELECT id, name, email, role, password_hash, avatar_url, total_points, is_active
     FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (!user.is_active) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  delete user.password_hash;
  const token = signToken(user);

  res.json({ token, user });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Joins users with vw_learner_badges to return badge level alongside profile.
// vw_learner_badges only contains rows where role = 'learner'; for other roles
// we fall back to the users table alone so the endpoint is safe for all roles.
router.get('/me', authRequired, async (req, res) => {
  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.avatar_url,
       u.total_points,
       lb.badge,
       lb.next_badge_threshold
     FROM users u
     LEFT JOIN vw_learner_badges lb ON lb.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ user: result.rows[0] });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

export default router;
