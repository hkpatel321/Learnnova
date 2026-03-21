import { Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';

// Pages (lazy imports keep the initial bundle small)
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import BrowseCourses   from './pages/BrowseCourses';
import MyCourses       from './pages/MyCourses';
import CourseDetail    from './pages/CourseDetail';
import LessonPlayer    from './pages/LessonPlayer';

// ── Protected route wrapper ───────────────────────────────────────────────────
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

      {/* Protected */}
      <Route path="/my-courses" element={
        <ProtectedRoute><MyCourses /></ProtectedRoute>
      } />
      <Route path="/learn/:courseId/:lessonId" element={
        <ProtectedRoute><LessonPlayer /></ProtectedRoute>
      } />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/courses" replace />} />
    </Routes>
  );
}
