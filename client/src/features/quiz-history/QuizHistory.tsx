import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { historyApi } from '@/api/history';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { Pagination } from '@/components/ui/Pagination';
import { AttemptComparison } from './AttemptComparison';
import { formatDuration, formatPercent } from '@/utils/display';
import type { HistoryEntry } from '@/types/history';
export default function QuizHistory() {
  const { projectId } = useParams(),
    uid = useSession((state) => state.user!.uid);
  const [page, setPage] = useState(1),
    [status, setStatus] = useState<HistoryEntry['status'] | ''>(''),
    [selected, setSelected] = useState<string | null>(null);
  const history = useQuery({
    queryKey: [uid, 'history', projectId, page, status],
    queryFn: ({ signal }) =>
      historyApi.list({ page, projectId, status: status || undefined }, signal),
    staleTime: 10000,
  });
  return (
    <section>
      {projectId && (
        <Link
          className="text-sm text-teal-800 dark:text-teal-300 underline"
          to={'/projects/' + projectId}
        >
          Back to project
        </Link>
      )}
      <h1 className="my-5 text-2xl font-semibold">
        {projectId ? 'Project study history' : 'Study history'}
      </h1>
      <label className="mb-4 grid max-w-xs gap-1 text-sm">
        Attempt status
        <select
          className="rounded border border-slate-300 dark:border-slate-600 p-2"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
            setSelected(null);
          }}
        >
          <option value="">All attempts</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="ABANDONED">Abandoned</option>
        </select>
      </label>
      <AsyncState
        loading={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
        empty={
          history.data?.total === 0 ? 'No attempts match this history view.' : undefined
        }
      />
      <ul className="grid gap-3">
        {history.data?.data.map((attempt) => (
          <li
            key={attempt.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
          >
            <h2 className="font-semibold">
              {attempt.quizTitle} · version {attempt.version}
            </h2>
            <p className="my-2 text-sm text-slate-600 dark:text-slate-300">
              {attempt.projectTitle}
              {attempt.projectDeleted ? ' (removed project)' : ''} · {attempt.mode} ·{' '}
              {attempt.difficulty} · {new Date(attempt.startedAt).toLocaleString()}
            </p>
            <p className="mb-3 text-sm">
              {attempt.status === 'COMPLETED'
                ? 'Score ' +
                  formatPercent(attempt.percentage) +
                  ' · elapsed ' +
                  formatDuration(attempt.elapsedMs)
                : attempt.status === 'IN_PROGRESS'
                  ? 'In progress · saved at question ' + (attempt.lastQuestionIndex + 1)
                  : 'Abandoned · no completed score'}
              {attempt.quizDeleted ? ' · quiz removed from active library' : ''}
            </p>
            <div className="flex flex-wrap gap-4">
              {attempt.status === 'COMPLETED' ? (
                <Link
                  className="text-teal-800 dark:text-teal-300 underline"
                  to={'/attempts/' + attempt.id + '/results'}
                >
                  Review / retake
                </Link>
              ) : (
                <Link
                  className="text-teal-800 dark:text-teal-300 underline"
                  to={'/attempts/' + attempt.id}
                >
                  {attempt.status === 'IN_PROGRESS'
                    ? 'Resume attempt'
                    : 'View recorded attempt'}
                </Link>
              )}
              <button className="underline" onClick={() => setSelected(attempt.id)}>
                Compare attempt
              </button>
              {!projectId && (
                <Link
                  className="text-teal-800 dark:text-teal-300 underline"
                  to={'/projects/' + attempt.projectId + '/history'}
                >
                  Project history
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {history.data && (
        <Pagination
          page={page}
          pageSize={12}
          total={history.data.total}
          onChange={setPage}
        />
      )}
      {selected && <AttemptComparison key={selected} attemptId={selected} />}
    </section>
  );
}
