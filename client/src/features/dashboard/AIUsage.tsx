import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import { usageApi } from '@/api/usage';
export function AIUsage({ compact = false }: { compact?: boolean }) {
  const uid = useSession((s) => s.user!.uid),
    query = useQuery({
      queryKey: [uid, 'ai-usage'],
      queryFn: ({ signal }) => usageApi.read(signal),
      staleTime: 15000,
      refetchInterval: 30000,
    });
  if (query.isPending)
    return (
      <p role="status" className="my-3 text-sm">
        Loading AI allowance…
      </p>
    );
  if (query.isError)
    return (
      <p role="status" className="my-3 text-sm">
        AI allowance unavailable.{' '}
        <button className="underline" onClick={() => void query.refetch()}>
          Refresh allowance
        </button>
      </p>
    );
  const { quota: q, data } = query.data,
    remaining = Math.max(0, q.requestLimit - q.requestsUsed),
    tokens = Math.max(0, q.tokenLimit - q.accountedTokens),
    limited = !remaining || !tokens;
  return (
    <section
      aria-label="AI usage"
      className="my-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="font-semibold">AI allowance</h2>
      <p className="mt-2 text-sm">
        {remaining} of {q.requestLimit} requests remaining · {tokens.toLocaleString()} of{' '}
        {q.tokenLimit.toLocaleString()} accounted tokens remaining
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {q.requestsUsed} requests used today (UTC). Resets{' '}
        {new Date(q.resetsAt).toLocaleString()}. Active generations: {q.active} /{' '}
        {q.concurrencyLimit}.
      </p>
      <progress
        className="mt-3 w-full accent-teal-700"
        aria-label="AI requests used"
        max={q.requestLimit || 1}
        value={q.requestsUsed}
      />
      {limited && (
        <p role="status" className="mt-2 text-sm">
          Generation allowance is exhausted. Saved notes, summaries and quiz retakes
          remain available.
        </p>
      )}
      {!compact && (
        <>
          <h3 className="mt-4 font-medium">Latest generation requests</h3>
          {!data.length && <p className="mt-2 text-sm">No AI requests yet.</p>}
          <ul className="mt-2 space-y-2 text-sm">
            {data.map((row) => (
              <li key={row.id}>
                {row.operation} · {row.status} ·{' '}
                {new Date(row.createdAt).toLocaleString()} · Tokens:{' '}
                {row.inputTokens === null || row.outputTokens === null
                  ? 'Unavailable'
                  : row.inputTokens + row.outputTokens}{' '}
                · Estimated cost:{' '}
                {row.estimatedCost === null
                  ? 'Unavailable'
                  : '$' + Number(row.estimatedCost).toFixed(6)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
