const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const reportingController = require('../controllers/reporting.controller');

const router = Router();


router.use(authenticate, requireRole('instructor', 'admin'));


router.get('/', reportingController.getReportingData);


router.get('/courses/:courseId', reportingController.getCourseStats);

module.exports = router;
