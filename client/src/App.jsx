import { Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';

// Pages (lazy imports keep the initial bundle small)
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import BrowseCourses   from './pages/BrowseCourses';
import MyCourses       from './pages/MyCourses';
import CourseDetail    from './pages/CourseDetail';
import LessonPlayer    from './pages/LessonPlayer';
import CourseQuizPlayerPage from './pages/CourseQuizPlayerPage';

// Admin pages
import AdminLayout      from './layouts/AdminLayout';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminCourses     from './pages/admin/AdminCourses';
import AdminCourseForm  from './pages/admin/AdminCourseForm';
import AdminReporting   from './pages/admin/AdminReporting';
import AdminUsers       from './pages/admin/AdminUsers';

// ── Protected route wrapper (Module B — learner) ─────────────────────────────
function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public redirect */}
      <Route path="/" element={<Navigate to="/courses" replace />} />

      {/* Auth */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public catalog */}
      <Route path="/courses"    element={<BrowseCourses />} />
      <Route path="/courses/:id" element={<CourseDetail />} />

      {/* Protected (learner) */}
      <Route path="/my-courses" element={
        <ProtectedRoute><MyCourses /></ProtectedRoute>
      } />
      <Route path="/learn/:courseId/:lessonId" element={
        <ProtectedRoute><LessonPlayer /></ProtectedRoute>
      } />
      <Route path="/learn/:courseId/quiz/:quizId" element={
        <ProtectedRoute><CourseQuizPlayerPage /></ProtectedRoute>
      } />

      {/* ── Admin / Instructor backoffice ───────────────────────────────── */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <AdminLayout title="Dashboard" />
        </AdminProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/courses" replace />} />
        <Route path="courses"     element={<AdminCourses />} />
        <Route path="courses/:id" element={<AdminCourseForm />} />
        <Route path="reporting"   element={<AdminReporting />} />
        <Route path="users"       element={
          <AdminProtectedRoute adminOnly>
            <AdminUsers />
          </AdminProtectedRoute>
        } />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/courses" replace />} />
    </Routes>
  );
}
