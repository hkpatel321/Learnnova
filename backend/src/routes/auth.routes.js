const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { rejectUnknownBodyFields } = require('../middleware/requestSecurity');
const authController = require('../controllers/auth.controller');

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────────
router.post(
  '/register',
  rejectUnknownBodyFields(['name', 'email', 'password', 'role']),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be between 2 and 80 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters'),
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
  rejectUnknownBodyFields(['email', 'password']),
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

router.post(
  '/forgot-password',
  rejectUnknownBodyFields(['email']),
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email is required'),
  ],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  rejectUnknownBodyFields(['token', 'password']),
  [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters'),
  ],
  validate,
  authController.resetPassword
);

// ── POST /api/auth/refresh ───────────────────────────────────────
router.post('/refresh', authController.refreshToken);

// ── GET  /api/auth/me ────────────────────────────────────────────
router.get('/me', authenticate, authController.getMe);

// ── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', authenticate, authController.logout);

module.exports = router;
