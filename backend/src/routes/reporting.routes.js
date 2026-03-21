const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const reportingController = require('../controllers/reporting.controller');

const router = Router();

// All reporting routes require auth and instructor/admin roles
router.use(authenticate, requireRole('instructor', 'admin'));

// GET /api/reporting
router.get('/', reportingController.getReportingData);

// GET /api/reporting/courses/:courseId
router.get('/courses/:courseId', reportingController.getCourseStats);

module.exports = router;
