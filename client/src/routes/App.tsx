import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useSession } from '@/store/session';
import { WorkspaceLayout } from '@/features/dashboard/WorkspaceLayout';

const ProjectLibrary = lazy(() => import('@/features/projects/ProjectLibrary'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));
const ProjectDetail = lazy(() => import('@/features/projects/ProjectDetail'));
const NotePage = lazy(() => import('@/features/notes/NotePage'));
const ProfileForm = lazy(() => import('@/features/settings/ProfileForm'));
const SummaryLibrary = lazy(() => import('@/features/summaries/SummaryLibrary'));
const SummaryDetail = lazy(() =>
  import('@/features/summaries/SummaryLibrary').then((module) => ({
    default: module.SummaryDetail,
  })),
);

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
              <Route path="/" element={<ProjectLibrary />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/projects/:projectId/summaries" element={<SummaryLibrary />} />
              <Route path="/summaries/:summaryId" element={<SummaryDetail />} />
              <Route path="/projects/:projectId/notes/:noteId" element={<NotePage />} />
              <Route
                path="/projects/new"
                element={<Navigate to="/?create=true" replace />}
              />
              <Route path="/settings" element={<ProfileForm />} />
            </Route>
          </Route>
          <Route path="*" element={<p className="p-8">Page not found.</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
