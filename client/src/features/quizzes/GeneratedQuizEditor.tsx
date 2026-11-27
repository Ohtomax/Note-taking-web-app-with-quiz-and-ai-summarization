import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QuizEditor } from './QuizEditor';
import { quizSettingsSchema, type QuizSettings } from '@/types/quiz-settings';
import { quizResultSchema, type QuizDraft } from '@/types/quiz';
import type { Generation } from '@/types/study';
import { quizzesApi } from '@/api/quizzes';
import { useSession } from '@/store/session';
export function GeneratedQuizEditor({ generation }: { generation: Generation }) {
  const uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const parsedSettings = quizSettingsSchema.safeParse(generation.result?.settings);
  const draft = parsedSettings.success
    ? quizResultSchema(
        parsedSettings.data,
        generation.result!.sources.map((source) => source.sourceKey),
      ).safeParse(generation.result!.output)
    : null;
  const save = useMutation({
    mutationFn: (input: { settings: QuizSettings; content: QuizDraft }) =>
      quizzesApi.saveGenerated(
        generation.result!.projectId,
        generation.id,
        input.settings,
        input.content,
      ),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [uid, 'quizzes'] });
      void cache.invalidateQueries({ queryKey: [uid, 'dashboard'] });
    },
  });
  if (!parsedSettings.success || !draft?.success)
    return (
      <p role="alert">
        This quiz preview could not be validated. Your notes are unchanged.
      </p>
    );
  return (
    <section className="mt-5" aria-label="Quiz preview">
      <h3 className="text-lg font-semibold">Edit quiz preview</h3>
      {save.data ? (
        <p role="status">
          Quiz saved.{' '}
          <Link
            className="text-teal-800 underline"
            to={
              '/quizzes/' +
              save.data.data.quizId +
              '/versions/' +
              save.data.data.id +
              '/edit'
            }
          >
            Open saved version
          </Link>
        </p>
      ) : (
        <QuizEditor
          initial={{ settings: parsedSettings.data, content: draft.data }}
          sourceKeys={generation.result!.sources.map((source) => source.sourceKey)}
          onSave={(settings, content) => save.mutate({ settings, content })}
          busy={save.isPending}
          error={save.error}
        />
      )}
    </section>
  );
}
