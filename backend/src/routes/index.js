const { Router } = require('express');

const router = Router();

// ── Mount feature routers below ──────────────────────────────────
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);

const courseRoutes = require('./course.routes');
router.use('/courses', courseRoutes);

const reviewRoutes = require('./review.routes');
router.use('/', reviewRoutes);

const lessonRoutes = require('./lesson.routes');
router.use('/', lessonRoutes);

const quizRoutes = require('./quiz.routes');
router.use('/', quizRoutes);

const enrollmentRoutes = require('./enrollment.routes');
router.use('/', enrollmentRoutes);

const paymentRoutes = require('./payment.routes');
router.use('/', paymentRoutes);

const reportingRoutes = require('./reporting.routes');
router.use('/reporting', reportingRoutes);

const progressRoutes = require('./progress.routes');
router.use('/', progressRoutes);

const userRoutes = require('./user.routes');
router.use('/', userRoutes);

const activityRoutes = require('./activity.routes');
router.use('/', activityRoutes);



module.exports = router;
