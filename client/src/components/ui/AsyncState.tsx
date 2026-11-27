interface AsyncStateProps {
  loading: boolean;
  error: Error | null;
  retry: () => void;
  empty?: string | undefined;
}

export function AsyncState({ loading, error, retry, empty }: AsyncStateProps) {
  if (loading)
    return (
      <div role="status" aria-label="Loading workspace" className="grid gap-3 py-6">
        <span className="sr-only">Loading your workspace…</span>
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="my-4 rounded-lg border border-red-200 p-4 text-red-800"
      >
        <p>{error.message}</p>
        <button className="mt-3 underline" onClick={retry}>
          Try again
        </button>
      </div>
    );
  return empty ? (
    <p
      role="status"
      className="rounded-lg border border-dashed border-slate-300 p-8 text-slate-600"
    >
      {empty}
    </p>
  ) : null;
}
