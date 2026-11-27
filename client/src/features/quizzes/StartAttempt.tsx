import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
export function StartAttempt({
  quizId,
  versionId,
  version,
}: {
  quizId: string;
  versionId: string;
  version: number;
}) {
  const keys = useRef<Partial<Record<'PRACTICE' | 'EXAM', string>>>({}),
    navigate = useNavigate(),
    cache = useQueryClient(),
    uid = useSession((state) => state.user!.uid);
  const start = useMutation({
    mutationFn: (mode: 'PRACTICE' | 'EXAM') => {
      const key = keys.current[mode] ?? crypto.randomUUID();
      keys.current[mode] = key;
      return attemptsApi.start(quizId, key, {
        versionId,
        mode,
        shuffleQuestions: false,
        shuffleOptions: false,
      });
    },
    onSuccess: (response) => {
      if (useSession.getState().user?.uid !== uid) return;
      cache.setQueryData([uid, 'player-attempt', response.data.id], response);
      void cache.invalidateQueries({ queryKey: [uid, 'open-attempts'] });
      void navigate('/attempts/' + response.data.id);
    },
  });
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded bg-teal-800 px-3 py-2 text-white disabled:opacity-50"
          disabled={start.isPending}
          onClick={() => start.mutate('PRACTICE')}
        >
          Practice version {version}
        </button>
        <button
          className="rounded border border-slate-300 dark:border-slate-600 px-3 py-2 disabled:opacity-50"
          disabled={start.isPending}
          onClick={() => start.mutate('EXAM')}
        >
          Exam version {version}
        </button>
      </div>
      {start.error && (
        <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
          {start.error.message} Retrying the same mode reuses its start key.
        </p>
      )}
    </div>
  );
}
