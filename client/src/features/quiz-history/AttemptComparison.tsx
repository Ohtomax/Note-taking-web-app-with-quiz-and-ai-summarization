import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { historyApi } from '@/api/history';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { formatDuration, formatPercent } from '@/utils/display';
export function AttemptComparison({ attemptId }: { attemptId: string }) {
  const uid = useSession((state) => state.user!.uid);
  const comparison = useQuery({
    queryKey: [uid, 'history-comparison', attemptId],
    queryFn: ({ signal }) => historyApi.comparison(attemptId, signal),
    staleTime: 30000,
  });
  const data = comparison.data?.data;
  return (
    <section className="surface mt-6 p-5">
      <h2 className="text-lg font-semibold">Attempt comparison</h2>
      <AsyncState
        loading={comparison.isPending}
        error={comparison.error}
        retry={() => void comparison.refetch()}
      />
      {data && (
        <>
          <p className="my-3 text-sm">
            {data.quizTitle} · {data.attemptCount} completed attempts · best score{' '}
            {formatPercent(data.bestScore)}
          </p>
          {data.first?.percentage != null &&
            data.latest?.percentage != null &&
            data.attemptCount > 1 && (
              <p className="mb-3 text-sm text-muted">
                First to latest:{' '}
                {new Intl.NumberFormat(undefined, {
                  signDisplay: 'exceptZero',
                  maximumFractionDigits: 1,
                }).format(data.latest.percentage - data.first.percentage)}{' '}
                percentage points
              </p>
            )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-left text-sm">
              <caption className="sr-only">Attempt comparison</caption>
              <thead>
                <tr>
                  {['Attempt', 'Version', 'Status', 'Score', 'Elapsed time'].map(
                    (label) => (
                      <th
                        className="border-b border-slate-200 dark:border-slate-700 p-2"
                        key={label}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'First', item: data.first },
                  { label: 'Selected', item: data.selected },
                  { label: 'Latest', item: data.latest },
                ].map(({ label, item }) => {
                  return (
                    <tr key={label}>
                      <th className="p-2 font-medium">{label}</th>
                      <td className="p-2">{item?.version ?? '—'}</td>
                      <td className="p-2">{item?.status ?? 'No completed attempt'}</td>
                      <td className="p-2">
                        {item?.status === 'COMPLETED' ? (
                          <Link
                            className="text-teal-800 dark:text-teal-300 underline"
                            to={'/attempts/' + item.id + '/results'}
                          >
                            {formatPercent(item.percentage)}
                          </Link>
                        ) : (
                          'Not completed'
                        )}
                      </td>
                      <td className="p-2">{formatDuration(item?.elapsedMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
