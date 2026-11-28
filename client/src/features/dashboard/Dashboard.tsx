import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Folder,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { AIUsage } from './AIUsage';
import { CreateStudyNote } from './CreateStudyNote';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import { dashboardApi } from '@/api/dashboard';
import { AsyncState } from '@/components/ui/AsyncState';
import { formatPercent } from '@/utils/display';

interface StudyRow {
  id: string;
  title: string;
  url: string;
  detail: string;
}

function RecentCard({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  rows: StudyRow[];
  empty: string;
}) {
  return (
    <section className="surface min-w-0 p-5">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <Icon size={18} className="text-brand-text" aria-hidden="true" />
        {title}
      </h2>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-edge">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={row.url}
                className="group flex items-center gap-2 rounded-lg py-2.5 text-sm transition hover:bg-canvas hover:px-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium group-hover:text-brand-text">
                    {row.title}
                  </span>
                  <span className="text-xs text-muted">{row.detail}</span>
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-muted"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-canvas px-4 py-5 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

const dateLabel = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

export default function Dashboard() {
  const user = useSession((s) => s.user!);
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: [user.uid, 'dashboard'],
    queryFn: ({ signal }) => dashboardApi.read(signal),
    staleTime: 30000,
  });
  const data = query.data;
  const currentAttempt = data?.performance.recent.find(
    (attempt) => attempt.status === 'IN_PROGRESS',
  );
  const currentNote = data?.recent.notes[0];
  const currentSummary = data?.recent.summaries[0];
  const next = currentAttempt
    ? {
        title: currentAttempt.quizTitle,
        label: 'Resume quiz',
        to: '/attempts/' + currentAttempt.id,
      }
    : currentSummary
      ? {
          title: currentSummary.title,
          label: 'Read summary',
          to: '/summaries/' + currentSummary.id,
        }
      : currentNote
        ? {
            title: currentNote.title,
            label: 'Open note',
            to: '/projects/' + currentNote.projectId + '/notes/' + currentNote.id,
          }
        : null;
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-muted">{date}</p>
          <h1 className="page-title">Study dashboard</h1>
          <p className="mt-2 text-sm text-muted">
            Pick up where you left off, or start with a fresh note.
          </p>
        </div>
        <nav aria-label="Study shortcuts" className="flex flex-wrap gap-2">
          <Link className="action" to="/projects/new">
            <Plus size={17} aria-hidden="true" />
            Create project
          </Link>
          <button className="action action-primary" onClick={() => setCreating(true)}>
            <FilePlus2 size={17} aria-hidden="true" />
            Create note
          </button>
        </nav>
      </header>
      <AsyncState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          <section className="rounded-2xl border border-edge bg-brand-soft p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text">
                  <BookOpen size={17} aria-hidden="true" />
                  Continue studying
                </h2>
                <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {next?.title ?? 'Your next study session starts here'}
                </p>
                {!next && (
                  <p className="mt-1 text-sm text-muted">
                    Create a note in a project to start building your study material.
                  </p>
                )}
              </div>
              {next ? (
                <Link className="action action-primary" to={next.to}>
                  {next.label}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <Link className="action" to="/">
                  Browse projects
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </section>
          <section aria-labelledby="performance-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="performance-heading" className="font-semibold">
                Study performance
              </h2>
              <Link
                className="flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
                to="/analytics"
              >
                Study analytics
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  ['Notes', data.performance.workspace.notes, FileText],
                  ['Saved summaries', data.performance.workspace.summaries, Sparkles],
                  [
                    'Quizzes completed · 30 days',
                    data.performance.totals.completedAttempts,
                    ClipboardCheck,
                  ],
                  [
                    'Average score · 30 days',
                    data.performance.totals.meanScore === null
                      ? '—'
                      : formatPercent(data.performance.totals.meanScore),
                    Activity,
                  ],
                ] as const
              ).map(([name, value, Icon]) => (
                <div className="surface p-4" key={name}>
                  <Icon size={17} aria-hidden="true" className="mb-2 text-brand-text" />
                  <dt className="text-xs text-muted sm:text-sm">{name}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentCard
              title="Recently opened notes"
              icon={FileText}
              empty="Open a note to see it here."
              rows={data.recent.notes.map((n) => ({
                id: n.id,
                title: n.title,
                url: '/projects/' + n.projectId + '/notes/' + n.id,
                detail: dateLabel(n.lastOpenedAt),
              }))}
            />
            <RecentCard
              title="Project folders"
              icon={Folder}
              empty="Create a project to keep related notes together."
              rows={data.recent.projects.map((p) => ({
                id: p.id,
                title: p.title,
                url: '/projects/' + p.id,
                detail: dateLabel(p.createdAt),
              }))}
            />
            <RecentCard
              title="Recent summaries"
              icon={Sparkles}
              empty="Generate and save a summary from your study sources."
              rows={data.recent.summaries.map((s) => ({
                id: s.id,
                title: s.title,
                url: '/summaries/' + s.id,
                detail: dateLabel(s.generatedAt),
              }))}
            />
            <RecentCard
              title="Recent quiz attempts"
              icon={ClipboardCheck}
              empty="Start a quiz to track your progress here."
              rows={data.performance.recent.map((a) => ({
                id: a.id,
                title: a.quizTitle,
                url: '/attempts/' + a.id + (a.status === 'COMPLETED' ? '/results' : ''),
                detail:
                  a.status === 'COMPLETED'
                    ? formatPercent(a.percentage) + ' · ' + dateLabel(a.finishedAt)
                    : a.status === 'IN_PROGRESS'
                      ? 'In progress'
                      : 'Abandoned',
              }))}
            />
            <RecentCard
              title="Saved quizzes"
              icon={BookOpen}
              empty="Save a generated quiz to study it again anytime."
              rows={data.recent.quizzes.map((q) => ({
                id: q.id,
                title: q.title,
                url: '/quizzes/' + q.id,
                detail: dateLabel(q.createdAt),
              }))}
            />
            <AIUsage />
          </div>
        </>
      )}
      {creating && <CreateStudyNote onClose={() => setCreating(false)} />}
    </section>
  );
}
