import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useSession } from '@/store/session';
import { WorkspaceLayout } from '@/features/dashboard/WorkspaceLayout';

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
            <Route element={<WorkspaceLayout />}>
              <Route path="/" element={<WorkspacePage />} />
              <Route
                path="/projects/new"
                element={<p>Create a project from your library in the next task.</p>}
              />
              <Route
                path="/settings"
                element={<p>Profile settings will be available in P3-T23.</p>}
              />
            </Route>
          </Route>
          <Route path="*" element={<p className="p-8">Page not found.</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
