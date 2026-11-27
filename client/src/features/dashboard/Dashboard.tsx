import { useState } from 'react';
import { AIUsage } from './AIUsage';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import { dashboardApi } from '@/api/dashboard';
import { PerformanceOverview } from '@/features/analytics/AnalyticsPage';
import { AsyncState } from '@/components/ui/AsyncState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useProjects } from '@/features/projects/useProjects';
import { initialQuery } from '@/features/projects/project-display';
import { notesApi } from '@/api/notes';
import { useNoteMutation } from '@/features/notes/useNotes';
function CreateStudyNote({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState(initialQuery),
    projects = useProjects(query),
    create = useNoteMutation(notesApi.create),
    navigate = useNavigate();
  return (
    <Modal
      title="Choose a project for your note"
      onClose={onClose}
      busy={create.isPending}
    >
      <label>
        Find project
        <input
          type="search"
          className="m-2 rounded border p-2"
          value={query.search}
          onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
        />
      </label>
      <AsyncState
        loading={projects.isPending}
        error={projects.error || create.error}
        retry={() => void projects.refetch()}
      />
      <ul className="my-4 space-y-2">
        {projects.data?.data
          .filter((p) => !p.archivedAt)
          .map((p) => (
            <li key={p.id}>
              <button
                className="w-full rounded border p-3 text-left"
                disabled={create.isPending}
                onClick={() =>
                  create.mutate(p.id, {
                    onSuccess: (response) =>
                      navigate('/projects/' + p.id + '/notes/' + response.data.id),
                  })
                }
              >
                {p.title}
              </button>
            </li>
          ))}
      </ul>
      {projects.data && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={projects.data.total}
          onChange={(page) => setQuery({ ...query, page })}
        />
      )}
      <Link className="underline" to="/projects/new">
        Create a project first
      </Link>
    </Modal>
  );
}
export default function Dashboard() {
  const user = useSession((s) => s.user!),
    [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: [user.uid, 'dashboard'],
    queryFn: ({ signal }) => dashboardApi.read(signal),
    staleTime: 30000,
  });
  const data = query.data;
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm text-slate-600 dark:text-slate-300">Your study workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Welcome back{user.email ? ', ' + user.email.split('@')[0] : ''}
        </h1>
      </header>
      <nav
        aria-label="Study shortcuts"
        className="flex flex-wrap gap-4 text-teal-800 dark:text-teal-300 underline"
      >
        <Link to="/projects/new">Create project</Link>
        <button onClick={() => setCreating(true)}>Create note</button>
        <Link to="/">All projects</Link>
        <Link to="/history">Study history</Link>
        <Link to="/analytics">Study analytics</Link>
      </nav>
      <AsyncState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(data.performance.workspace)
              .filter(([key]) => !key.startsWith('archived'))
              .map(([key, value]) => (
                <div
                  className="rounded-xl border bg-white dark:bg-slate-900 p-4"
                  key={key}
                >
                  <dt className="capitalize">{key}</dt>
                  <dd className="mt-2 text-2xl font-semibold">{value}</dd>
                </div>
              ))}
          </dl>
          <div className="grid gap-6 md:grid-cols-2">
            {(
              [
                [
                  'Recently opened notes',
                  data.recent.notes.map((n) => ({
                    id: n.id,
                    title: n.title,
                    url: '/projects/' + n.projectId + '/notes/' + n.id,
                  })),
                ],
                [
                  'Newest projects',
                  data.recent.projects.map((p) => ({
                    id: p.id,
                    title: p.title,
                    url: '/projects/' + p.id,
                  })),
                ],
                [
                  'Newest summaries',
                  data.recent.summaries.map((s) => ({
                    id: s.id,
                    title: s.title,
                    url: '/summaries/' + s.id,
                  })),
                ],
                [
                  'Newest quizzes',
                  data.recent.quizzes.map((q) => ({
                    id: q.id,
                    title: q.title,
                    url: '/quizzes/' + q.id,
                  })),
                ],
              ] as const
            ).map(([label, rows]) => (
              <section
                className="rounded-xl border bg-white dark:bg-slate-900 p-5"
                key={label}
              >
                <h2 className="font-semibold">{label}</h2>
                {!rows.length && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    Nothing here yet.
                  </p>
                )}
                <ul className="mt-3 space-y-3">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        className="break-words text-teal-800 dark:text-teal-300 underline"
                        to={row.url}
                      >
                        {row.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Recent attempts</h2>
            {!data.performance.recent.length && (
              <p>No attempts yet. Save a quiz to start studying.</p>
            )}
            <ul className="space-y-3">
              {data.performance.recent.map((a) => (
                <li key={a.id}>
                  <Link
                    className="text-teal-800 dark:text-teal-300 underline"
                    to={
                      '/attempts/' + a.id + (a.status === 'COMPLETED' ? '/results' : '')
                    }
                  >
                    {a.quizTitle} · Version {a.version} · {a.status.replaceAll('_', ' ')}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <h2 className="text-lg font-semibold">Performance in the last 30 days</h2>
          <AIUsage />
          <PerformanceOverview data={data.performance} />
        </>
      )}
      {creating && <CreateStudyNote onClose={() => setCreating(false)} />}
    </section>
  );
}
