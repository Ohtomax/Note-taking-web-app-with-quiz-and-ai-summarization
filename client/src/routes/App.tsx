import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));

export function App() {
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
          <Route path="/" element={<WorkspacePage />} />
          <Route path="*" element={<p className="p-8">Page not found.</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
