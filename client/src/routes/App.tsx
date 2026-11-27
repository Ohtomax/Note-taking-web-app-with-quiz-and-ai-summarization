import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useSession } from '@/store/session';

const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));

export function App() {
  const { user, loading } = useSession();
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div role="status" className="mx-auto mt-24 max-w-xl animate-pulse p-8">
            Loading workspace…
          </div>
        }
      >
        <Routes>
          <Route
            path="/auth"
            element={!loading && user ? <Navigate to="/" replace /> : <AuthPage />}
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<WorkspacePage />} />
          </Route>
          <Route path="*" element={<p className="p-8">Page not found.</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
