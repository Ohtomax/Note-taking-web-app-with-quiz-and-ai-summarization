import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import type { PlayerAttempt } from '@/types/attempts';
export function RetakeQuiz({ attempt }: { attempt: PlayerAttempt }) {
  const [mode, setMode] = useState(attempt.mode),
    [shuffleQuestions, setShuffleQuestions] = useState(false),
    [shuffleOptions, setShuffleOptions] = useState(false);
  const action = useRef<{ signature: string; key: string } | null>(null),
    navigate = useNavigate(),
    cache = useQueryClient(),
    uid = useSession((state) => state.user!.uid);
  const start = useMutation({
    mutationFn: (missedOnly: boolean) => {
      const input = {
          versionId: attempt.versionId,
          ...(missedOnly ? { missedFromAttemptId: attempt.id } : {}),
          mode,
          shuffleQuestions,
          shuffleOptions,
        },
        signature = JSON.stringify(input);
      if (action.current?.signature !== signature)
        action.current = { signature, key: crypto.randomUUID() };
      return attemptsApi.start(attempt.quizId, action.current.key, input);
    },
    onSuccess: (response) => {
      if (useSession.getState().user?.uid !== uid) return;
      cache.setQueryData([uid, 'player-attempt', response.data.id], response);
      void cache.invalidateQueries({ queryKey: [uid, 'history'] });
      for (const domain of ['open-attempts', 'history', 'dashboard', 'analytics'])
        void cache.invalidateQueries({ queryKey: [uid, domain] });
      void navigate('/attempts/' + response.data.id);
    },
  });
  return (
    <section className="surface grid gap-3 p-5" aria-label="Retake quiz">
      <h2 className="font-semibold">Retake version {attempt.version}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Retaking uses this saved question set and creates a separate attempt without an AI
        call.
      </p>
      <label className="grid max-w-xs gap-1 text-sm">
        Retake mode
        <select
          className="rounded border border-slate-300 dark:border-slate-600 p-2"
          disabled={start.isPending}
          value={mode}
          onChange={(event) => setMode(event.target.value as PlayerAttempt['mode'])}
        >
          <option>PRACTICE</option>
          <option>EXAM</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={start.isPending}
          checked={shuffleQuestions}
          onChange={(event) => setShuffleQuestions(event.target.checked)}
        />
        Shuffle questions
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={start.isPending}
          checked={shuffleOptions}
          onChange={(event) => setShuffleOptions(event.target.checked)}
        />
        Shuffle options
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="action action-primary"
          disabled={start.isPending}
          onClick={() => start.mutate(false)}
        >
          {start.isPending
            ? 'Starting…'
            : start.error && !start.variables
              ? 'Retry retake'
              : 'Retake this version'}
        </button>
        {Boolean(attempt.result?.incorrectCount) && (
          <button
            className="action"
            disabled={start.isPending}
            onClick={() => start.mutate(true)}
          >
            {start.error && start.variables
              ? 'Retry focused retake'
              : 'Retake incorrect questions'}
          </button>
        )}
      </div>
      {start.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {start.error.message} Retrying keeps the same start key.
        </p>
      )}
      <p className="text-sm">
        To create new questions from current notes,{' '}
        <Link
          className="text-teal-800 dark:text-teal-300 underline"
          to={'/quizzes/' + attempt.quizId + '?regenerate=true'}
        >
          generate a new quiz
        </Link>
        . Generation uses AI allowance.
      </p>
    </section>
  );
}
