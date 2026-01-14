import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/core/hooks';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isDU2 = location.pathname.startsWith('/du2');
  const isOnlyBill = location.pathname.startsWith('/only-bill');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={isDU2 ? "/du2/login" : "/login"} state={{ from: location.pathname }} replace />;
  }

  // Strict Isolation for Only Bill Admin
  if (user.email === 'admin@admin.com' && !isOnlyBill) {
      return <Navigate to="/only-bill/admin" replace />;
  }

  return <Outlet />;
};

export const PublicRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const isDU2 = window.location.pathname.startsWith('/du2');

  if (loading) return null;

  if (user) {
    if (user.email === 'admin@admin.com') {
        return <Navigate to="/only-bill/admin" replace />;
    }
    return <Navigate to={isDU2 ? "/du2" : "/"} replace />;
  }
  return <Outlet />;
};
