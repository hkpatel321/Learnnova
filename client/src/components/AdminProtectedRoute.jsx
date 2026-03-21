import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Protects admin routes:
 * - Not logged in → /login
 * - Learner role  → /my-courses (wrong portal)
 * - Admin/instructor → render children
 */
export default function AdminProtectedRoute({ children, adminOnly = false }) {
  const { user, isLoading, isLoggedIn } = useAuth();

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  // Learner trying to access admin
  if (user.role === 'learner') {
    return <Navigate to="/my-courses" replace />;
  }

  // Admin-only route but user is instructor
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/admin/courses" replace />;
  }

  return children;
}
