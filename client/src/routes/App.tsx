import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div role="status" className="p-8">
            Loading workspace…
          </div>
        }
      >
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<WorkspacePage />} />
          <Route path="*" element={<p className="p-8">Page not found.</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
