import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Folder,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logOut, authError } from '@/features/auth/auth.service';
import { useWorkspace } from '@/store/workspace';
import { useSession } from '@/store/session';
import { useProjects } from '@/features/projects/useProjects';
import { initialQuery } from '@/features/projects/project-display';
import { useNotes } from '@/features/notes/useNotes';
import { CreateStudyNote } from './CreateStudyNote';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/', label: 'My projects', icon: Folder },
  { to: '/history', label: 'Study history', icon: History },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function FolderNotes({ projectId, close }: { projectId: string; close: () => void }) {
  const notes = useNotes(projectId, initialQuery);
  return (
    <ul className="ml-4 space-y-1 border-l border-edge pl-3 text-sm">
      {notes.isPending && (
        <li role="status" className="animate-pulse px-2 py-1 text-muted">
          Loading notes…
        </li>
      )}
      {notes.error && (
        <li>
          <button className="px-2 py-1 underline" onClick={() => void notes.refetch()}>
            Retry loading notes
          </button>
        </li>
      )}
      {notes.data?.data.map((note) => (
        <li key={note.id}>
          <NavLink
            className="block truncate rounded px-2 py-1 hover:bg-canvas aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-text"
            title={note.title}
            to={'/projects/' + projectId + '/notes/' + note.id}
            onClick={close}
          >
            {note.title}
          </NavLink>
        </li>
      ))}
      {notes.data?.total === 0 && <li className="px-2 py-1 text-muted">No notes yet</li>}
      {Boolean(notes.data && notes.data.total > initialQuery.pageSize) && (
        <li>
          <Link
            to={'/projects/' + projectId}
            onClick={close}
            className="px-2 py-1 text-brand-text underline"
          >
            All notes
          </Link>
        </li>
      )}
    </ul>
  );
}

function SidebarFolders({ close }: { close: () => void }) {
  const projects = useProjects(initialQuery);
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ul className="space-y-1">
      {projects.isPending && (
        <li role="status" className="animate-pulse px-2 py-1 text-sm text-muted">
          Loading projects…
        </li>
      )}
      {projects.error && (
        <li>
          <button
            className="px-2 py-1 text-sm underline"
            onClick={() => void projects.refetch()}
          >
            Retry loading projects
          </button>
        </li>
      )}
      {projects.data?.total === 0 && (
        <li className="px-2 py-1 text-sm text-muted">
          Create a project to organize your notes.
        </li>
      )}
      {projects.data?.data.map((project) => (
        <li key={project.id}>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1 text-muted hover:bg-canvas"
              aria-label={'Expand ' + project.title}
              aria-expanded={expanded === project.id}
              onClick={() => setExpanded(expanded === project.id ? null : project.id)}
            >
              {expanded === project.id ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )}
            </button>
            <NavLink
              className="min-w-0 flex-1 truncate rounded px-2 py-1 text-sm hover:bg-canvas aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-text"
              title={project.title}
              to={'/projects/' + project.id}
              end
              onClick={close}
            >
              {project.title}
            </NavLink>
          </div>
          {expanded === project.id && (
            <FolderNotes projectId={project.id} close={close} />
          )}
        </li>
      ))}
      {Boolean(projects.data && projects.data.total > initialQuery.pageSize) && (
        <li>
          <Link
            className="px-2 py-1 text-sm text-brand-text underline"
            to="/"
            onClick={close}
          >
            All projects
          </Link>
        </li>
      )}
    </ul>
  );
}

export function WorkspaceLayout() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useWorkspace();
  const user = useSession((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [folders, setFolders] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const breadcrumb =
    links.find((link) => link.to === location.pathname)?.label ??
    (location.pathname.includes('/notes/')
      ? 'Note'
      : location.pathname.includes('summaries')
        ? 'Summaries'
        : location.pathname.includes('attempts')
          ? 'Quiz session'
          : location.pathname.includes('quizzes')
            ? 'Quizzes'
            : 'Project');
  const signOut = async () => {
    try {
      await logOut();
    } catch (cause) {
      setError(authError(cause));
    }
  };
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    closeSidebar();
    void navigate(term ? '/?search=' + encodeURIComponent(term) : '/');
  };
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-panel focus:p-3"
        href="#main-content"
      >
        Skip to content
      </a>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      )}
      <aside
        id="workspace-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-edge bg-panel transition-[transform,width] duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0 max-md:visible' : '-translate-x-full max-md:invisible'} ${collapsed ? 'md:w-18' : 'md:w-64'}`}
      >
        <div className="flex min-h-17 items-center gap-2 px-4">
          <Link
            to="/dashboard"
            onClick={closeSidebar}
            className="flex min-w-0 flex-1 items-center gap-2.5 font-bold tracking-tight"
            aria-label="QuillQuiz dashboard"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white">
              <BookOpen size={18} aria-hidden="true" />
            </span>
            <span aria-hidden="true" className={collapsed ? 'md:hidden' : ''}>
              QuillQuiz
            </span>
          </Link>
          <button
            className={`action w-8 px-0 md:hidden`}
            aria-label="Close menu"
            onClick={closeSidebar}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <nav aria-label="Workspace" className="grid gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                title={label}
                aria-label={label}
                onClick={closeSidebar}
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-text"
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className={collapsed ? 'md:hidden' : ''}>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div
            className={`mt-7 border-t border-edge pt-4 ${collapsed ? 'md:hidden' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-muted hover:bg-canvas"
                aria-expanded={folders}
                onClick={() => setFolders(!folders)}
              >
                {folders ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Project
                folders
              </button>
              <Link
                className="rounded p-1.5 text-muted hover:bg-canvas"
                to="/projects/new"
                aria-label="New project"
                title="New project"
                onClick={closeSidebar}
              >
                <Plus size={17} />
              </Link>
            </div>
            {folders && <SidebarFolders close={closeSidebar} />}
          </div>
        </div>
        <div className="border-t border-edge p-3">
          <p
            title={user?.email ?? ''}
            className={`truncate px-3 py-1 text-xs text-muted ${collapsed ? 'md:hidden' : ''}`}
          >
            {user?.email}
          </p>
          <button
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted hover:bg-canvas"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut size={17} className="shrink-0" aria-hidden="true" />
            <span className={collapsed ? 'md:hidden' : ''}>Sign out</span>
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      </aside>
      <div
        className={`min-w-0 transition-[padding] duration-200 ${collapsed ? 'md:pl-18' : 'md:pl-64'}`}
      >
        <header className="flex min-h-17 flex-wrap items-center gap-2 border-b border-edge bg-panel px-4 py-3 sm:gap-3 lg:px-8">
          <button
            className="action w-10 px-0 md:hidden"
            aria-label="Menu"
            aria-controls="workspace-sidebar"
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
          >
            <Menu size={19} />
          </button>
          <button
            className="action hidden w-10 px-0 md:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-sm font-semibold">
            <span className="hidden font-medium text-muted lg:inline">
              Workspace <span aria-hidden="true">/ </span>
            </span>
            {breadcrumb}
          </nav>
          <form
            role="search"
            onSubmit={search}
            className="order-last flex w-full items-center gap-1 rounded-lg border border-edge bg-canvas px-2.5 text-muted sm:order-none sm:w-44 lg:w-60"
          >
            <Search size={16} className="shrink-0" aria-hidden="true" />
            <input
              name="q"
              type="search"
              maxLength={200}
              className="min-h-9 min-w-0 flex-1 px-1 text-xs"
              aria-label="Search projects"
              placeholder="Search projects…"
            />
            <button
              className="shrink-0 rounded p-1 hover:bg-panel"
              aria-label="Submit project search"
              title="Search"
            >
              <ArrowRight size={15} />
            </button>
          </form>
          <button
            className="action action-primary w-10 px-0 lg:w-auto lg:px-3.5"
            aria-label="New note"
            title="New note"
            onClick={() => {
              closeSidebar();
              setCreating(true);
            }}
          >
            <FilePlus2 size={17} aria-hidden="true" />
            <span className="hidden lg:inline">New note</span>
          </button>
          <ThemeToggle />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 sm:px-7 lg:px-9 lg:py-9"
        >
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {creating && <CreateStudyNote onClose={() => setCreating(false)} />}
    </div>
  );
}
