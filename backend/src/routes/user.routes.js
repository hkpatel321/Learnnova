const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = Router();

router.get(
  '/users',
  authenticate,
  requireRole('instructor', 'admin'),
  userController.getUsers
);

module.exports = router;
