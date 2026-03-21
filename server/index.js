import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { initDB } from './initDB.js';
//import { seedDummyData } from './seed.js';
await initDB();
//await seedDummyData();
import { testConnection } from './db.js';
// Route modules
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import enrollmentsRoutes from './routes/enrollments.js';
import lessonsRoutes from './routes/lessons.js';
import quizzesRoutes from './routes/quizzes.js';
import reviewsRoutes from './routes/reviews.js';

// Module A – Admin / Instructor route modules
import adminCourses from './routes/admin/courses.js';
import adminLessons from './routes/admin/lessons.js';
import adminQuizzes from './routes/admin/quizzes.js';
import adminAttendees from './routes/admin/attendees.js';
import adminReporting from './routes/admin/reporting.js';
import adminUsers from './routes/admin/users.js';
import { initSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);

// ── Security & parsing middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

// ── Routes (Module B — Learner side) ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/quizzes', quizzesRoutes);

// Reviews are nested under courses: /api/courses/:id/reviews
app.use('/api/courses/:id/reviews', reviewsRoutes);

// ── Routes (Module A — Admin / Instructor backoffice) ────────────────────────
app.use('/api/admin/courses',   adminCourses);
app.use('/api/admin/lessons',   adminLessons);
app.use('/api/admin/quizzes',   adminQuizzes);
app.use('/api/admin/attendees', adminAttendees);
app.use('/api/admin/reporting', adminReporting);
app.use('/api/admin/users',     adminUsers);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Must have exactly 4 arguments so Express treats it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);

  const status = err.status ?? err.statusCode ?? 500;
  const message =
    status < 500
      ? err.message
      : 'An unexpected server error occurred. Please try again later.';

  res.status(status).json({ error: message });
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

await testConnection();
initSocket(httpServer, process.env.CLIENT_URL || 'http://localhost:5173');

httpServer.listen(PORT, () => {
  console.log(`✅  Learnova API running on http://localhost:${PORT}`);
});

export default app;
