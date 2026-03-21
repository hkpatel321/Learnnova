import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// Public Pages
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage';
import ResetPasswordPage from '../pages/public/ResetPasswordPage';
import InvitationAcceptPage from '../pages/public/InvitationAcceptPage';

// Learner Pages
import CourseCatalogPage from '../pages/public/CourseCatalogPage';
import MyCoursesPage from '../pages/learner/MyCoursesPage';
import CourseDetailPage from '../pages/learner/CourseDetailPage';
import LessonPlayerPage from '../pages/learner/LessonPlayerPage';
import LearnerLayout from '../components/layout/LearnerLayout';

// Instructor Pages
import BackofficeLayout from '../components/layout/BackofficeLayout';
import CoursesPage from '../pages/instructor/CoursesPage';
import CourseFormPage from '../pages/instructor/CourseFormPage';
import ReportingPage from '../pages/instructor/ReportingPage';

import NotFoundPage from '../pages/public/NotFoundPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invitations/:token" element={<InvitationAcceptPage />} />

      {/* Learner Layout Routes */}
      <Route element={<LearnerLayout />}>
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route
          path="/my-courses"
          element={
            <ProtectedRoute allowedRoles={['learner']}>
              <MyCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute allowedRoles={['learner', 'instructor', 'admin']}>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:courseId/:lessonId"
          element={
            <ProtectedRoute allowedRoles={['learner']}>
              <LessonPlayerPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Instructor / Admin — BackofficeLayout */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <BackofficeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/backoffice/courses" element={<CoursesPage />} />
        <Route path="/backoffice/courses/new" element={<CourseFormPage />} />
        <Route path="/backoffice/courses/:courseId" element={<CourseFormPage />} />
        <Route path="/backoffice/reporting" element={<ReportingPage />} />
      </Route>

      {/* Default route / redirects */}
      <Route path="/" element={<Navigate to="/courses" replace />} />
      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
