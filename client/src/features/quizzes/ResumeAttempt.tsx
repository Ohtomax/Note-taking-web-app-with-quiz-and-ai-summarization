import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import type { OpenAttempt } from '@/types/attempts';
import { Modal } from '@/components/ui/Modal';
import { AsyncState } from '@/components/ui/AsyncState';
import { Pagination } from '@/components/ui/Pagination';
export function ResumeAttempt({ attempt }: { attempt: OpenAttempt }) {
  const [confirm, setConfirm] = useState(false),
    uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const abandon = useMutation({
    mutationFn: () => attemptsApi.abandon(attempt.id),
    onSuccess: async () => {
      await Promise.all(
        ['open-attempts', 'player-attempt', 'history', 'analytics', 'dashboard'].map(
          (domain) => cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
      setConfirm(false);
    },
  });
  if (abandon.isSuccess)
    return (
      <p role="status">
        Attempt abandoned. Its recorded answers remain in history without a completed
        score.
      </p>
    );
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">
        {attempt.quizTitle} · version {attempt.version}
      </h3>
      <p className="my-2 text-sm text-slate-600">
        {attempt.mode} · saved location: question {attempt.lastQuestionIndex + 1} of{' '}
        {attempt.totalQuestions}
      </p>
      <div className="flex gap-4">
        <Link className="text-teal-800 underline" to={'/attempts/' + attempt.id}>
          Resume attempt
        </Link>
        <button className="underline" onClick={() => setConfirm(true)}>
          Abandon attempt
        </button>
      </div>
      {confirm && (
        <Modal
          title="Abandon this attempt?"
          busy={abandon.isPending}
          onClose={() => setConfirm(false)}
        >
          <p>This makes the attempt read-only. It will not count as a completed score.</p>
          <div className="mt-4 flex gap-4">
            <button
              className="rounded bg-red-800 px-4 py-2 text-white disabled:opacity-50"
              disabled={abandon.isPending}
              onClick={() => abandon.mutate()}
            >
              Confirm abandonment
            </button>
            <button
              className="underline"
              disabled={abandon.isPending}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
          {abandon.error && <p role="alert">{abandon.error.message}</p>}
        </Modal>
      )}
    </article>
  );
}
export function OpenAttempts({ quizId }: { quizId?: string | undefined }) {
  const uid = useSession((state) => state.user!.uid),
    [page, setPage] = useState(1);
  const attempts = useQuery({
    queryKey: [uid, 'open-attempts', quizId, page],
    queryFn: ({ signal }) => attemptsApi.open(quizId, page, signal),
    staleTime: 10000,
  });
  return (
    <section className="my-5" aria-label="Unfinished attempts">
      <h2 className="mb-3 text-lg font-semibold">Unfinished attempts</h2>
      <AsyncState
        loading={attempts.isPending}
        error={attempts.error}
        retry={() => void attempts.refetch()}
        empty={attempts.data?.total === 0 ? 'No unfinished attempts.' : undefined}
      />
      <div className="grid gap-3">
        {attempts.data?.data.map((attempt) => (
          <ResumeAttempt key={attempt.id} attempt={attempt} />
        ))}
      </div>
      {attempts.data && (
        <Pagination
          page={page}
          pageSize={12}
          total={attempts.data.total}
          onChange={setPage}
        />
      )}
    </section>
  );
}
