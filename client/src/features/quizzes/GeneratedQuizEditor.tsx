import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QuizEditor } from './QuizEditor';
import { quizSettingsSchema, type QuizSettings } from '@/types/quiz-settings';
import { quizResultSchema, type QuizDraft } from '@/types/quiz';
import type { Generation } from '@/types/study';
import { quizzesApi } from '@/api/quizzes';
import { useSession } from '@/store/session';
import type { QuizRegenerationTarget } from '@/types/quiz-library';
export function GeneratedQuizEditor({
  generation,
  target,
}: {
  generation: Generation;
  target?: QuizRegenerationTarget | undefined;
}) {
  const uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const parsedSettings = quizSettingsSchema.safeParse(generation.result?.settings);
  const draft = parsedSettings.success
    ? quizResultSchema(
        parsedSettings.data,
        generation.result!.sources.map((source) => source.sourceKey),
      ).safeParse(generation.result!.output)
    : null;
  const save = useMutation({
    mutationFn: (input: { settings: QuizSettings; content: QuizDraft }) =>
      target
        ? quizzesApi.acceptGeneration(
            target.quizId,
            target.expectedVersion,
            generation.id,
            input.settings,
            input.content,
          )
        : quizzesApi.saveGenerated(
            generation.result!.projectId,
            generation.id,
            input.settings,
            input.content,
          ),
    onSuccess: () => {
      if (useSession.getState().user?.uid !== uid) return;
      for (const domain of ['quizzes', 'quiz', 'quiz-versions', 'analytics'])
        void cache.invalidateQueries({ queryKey: [uid, domain] });
      void cache.invalidateQueries({ queryKey: [uid, 'dashboard'] });
    },
  });
  if (!parsedSettings.success || !draft?.success)
    return <p role="alert">The generated quiz could not be validated.</p>;
  return (
    <section className="mt-5 border-t border-edge pt-5" aria-label="Quiz preview">
      <h3 className="text-lg font-semibold">{draft.data.title}</h3>
      {save.data ? (
        <p role="status">
          Quiz saved.{' '}
          <Link
            className="text-teal-800 dark:text-teal-300 underline"
            to={
              '/quizzes/' +
              save.data.data.quizId +
              '/versions/' +
              save.data.data.id +
              '/edit'
            }
          >
            Open saved version
          </Link>{' '}
          <Link
            className="action action-primary ml-2"
            to={'/quizzes/' + save.data.data.quizId}
          >
            Open quiz to start studying
          </Link>
        </p>
      ) : editing ? (
        <QuizEditor
          initial={{ settings: parsedSettings.data, content: draft.data }}
          sourceKeys={generation.result!.sources.map((source) => source.sourceKey)}
          onSave={(settings, content) => save.mutate({ settings, content })}
          busy={save.isPending}
          error={save.error}
        />
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted">
            {draft.data.questions.length} questions ·{' '}
            {parsedSettings.data.difficulty.toLowerCase()} difficulty
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="action action-primary"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({ settings: parsedSettings.data, content: draft.data })
              }
            >
              {save.isPending ? 'Saving…' : 'Save quiz'}
            </button>
            <button
              className="action"
              disabled={save.isPending}
              onClick={() => setEditing(true)}
              title="Authoring includes answer keys"
            >
              Edit questions
            </button>
          </div>
          {save.error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {save.error.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
