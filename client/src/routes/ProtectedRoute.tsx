import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/store/session';

export function ProtectedRoute() {
  const { user, loading } = useSession();
  if (loading)
    return (
      <p role="status" className="p-8">
        Restoring your session…
      </p>
    );
  return user ? <Outlet key={user.uid} /> : <Navigate to="/auth" replace />;
}
