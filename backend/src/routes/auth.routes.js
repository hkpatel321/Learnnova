const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────────
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['learner', 'instructor'])
      .withMessage('Role must be learner or instructor'),
  ],
  validate,
  authController.register
);

// ── POST /api/auth/login ─────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// ── POST /api/auth/refresh ───────────────────────────────────────
router.post('/refresh', authController.refreshToken);

// ── GET  /api/auth/me ────────────────────────────────────────────
router.get('/me', authenticate, authController.getMe);

// ── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);

module.exports = router;
