import { CircleAlert, Inbox } from 'lucide-react';

interface AsyncStateProps {
  loading: boolean;
  error: Error | null;
  retry: () => void;
  empty?: string | undefined;
}

export function AsyncState({ loading, error, retry, empty }: AsyncStateProps) {
  if (loading)
    return (
      <div role="status" aria-label="Loading workspace" className="grid gap-3 py-4">
        <span className="sr-only">Loading your workspace…</span>
        <div className="h-6 w-40 animate-pulse rounded-md bg-edge" />
        <div className="h-24 animate-pulse rounded-2xl border border-edge bg-panel" />
      </div>
    );
  if (error)
    return (
      <div role="alert" className="surface my-4 flex items-start gap-3 p-4 text-sm">
        <CircleAlert
          aria-hidden="true"
          size={19}
          className="shrink-0 text-red-600 dark:text-red-300"
        />
        <div>
          <p>{error.message}</p>
          <button
            className="mt-2 font-semibold text-brand-text underline"
            onClick={retry}
          >
            Try again
          </button>
        </div>
      </div>
    );
  return empty ? (
    <div
      role="status"
      className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-edge p-8 text-center text-sm text-muted"
    >
      <Inbox aria-hidden="true" size={22} className="text-brand-text" />
      <p>{empty}</p>
    </div>
  ) : null;
}
