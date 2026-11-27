import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { logOut, authError } from '@/features/auth/auth.service';
import { useWorkspace } from '@/store/workspace';
import { useSession } from '@/store/session';

export function WorkspaceLayout() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useWorkspace();
  const user = useSession((state) => state.user);
  const location = useLocation();
  const [error, setError] = useState('');
  const signOut = async () => {
    try {
      await logOut();
    } catch (cause) {
      setError(authError(cause));
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <button
          className="rounded-lg border border-slate-300 px-3 py-2"
          aria-controls="workspace-sidebar"
          aria-expanded={sidebarOpen}
          onClick={toggleSidebar}
        >
          Menu
        </button>
        <Link to="/" className="font-semibold text-teal-800">
          Studyspace
        </Link>
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link to="/">Workspace</Link>
          <span aria-hidden="true"> / </span>
          <span>
            {location.pathname.startsWith('/projects')
              ? 'Project'
              : location.pathname === '/settings'
                ? 'Settings'
                : 'My projects'}
          </span>
        </nav>
      </header>
      <div className="flex">
        {sidebarOpen && (
          <aside
            id="workspace-sidebar"
            className="fixed bottom-0 left-0 top-20 z-30 w-64 border-r border-slate-200 bg-white p-6 shadow-lg md:static md:min-h-[calc(100vh-5rem)] md:shrink-0 md:shadow-none"
          >
            <nav aria-label="Workspace" className="grid gap-2">
              <NavLink
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
                to="/analytics"
                onClick={closeSidebar}
              >
                Analytics
              </NavLink>
              <NavLink
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
                to="/history"
                onClick={closeSidebar}
              >
                Study history
              </NavLink>
              <NavLink
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
                to="/"
                end
                onClick={closeSidebar}
              >
                My projects
              </NavLink>
              <NavLink
                className="rounded-lg px-3 py-2 hover:bg-slate-100"
                to="/settings"
                onClick={closeSidebar}
              >
                Settings
              </NavLink>
            </nav>
            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="break-all text-sm text-slate-600">{user?.email}</p>
              <button className="mt-3 text-sm underline" onClick={signOut}>
                Sign out
              </button>
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          </aside>
        )}
        {sidebarOpen && (
          <button
            className="fixed inset-0 top-20 z-20 bg-slate-900/20 md:hidden"
            aria-label="Close navigation"
            onClick={closeSidebar}
          />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-5 py-8 md:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
