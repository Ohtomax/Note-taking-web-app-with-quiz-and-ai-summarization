import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizResultSchema, type QuizDraft } from '@/types/quiz';
import { quizQuestionSchema, type QuizQuestion } from '@/types/quiz-question';
import type { QuizSettings } from '@/types/quiz-settings';
import { authoringDraft } from '@/types/quiz-library';
import { quizzesApi } from '@/api/quizzes';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
interface QuizEditorProps {
  initial: { settings: QuizSettings; content: QuizDraft };
  sourceKeys: string[];
  onSave: (settings: QuizSettings, content: QuizDraft) => void;
  busy: boolean;
  error: Error | null;
  saveLabel?: string;
}
export function QuizEditor({
  initial,
  sourceKeys,
  onSave,
  busy,
  error,
  saveLabel = 'Save quiz',
}: QuizEditorProps) {
  const [draft, setDraft] = useState<QuizDraft>(initial.content);
  const settings = { ...initial.settings, title: draft.title };
  const validation = quizResultSchema(settings, sourceKeys).safeParse(draft);
  const change = (index: number, question: QuizQuestion) =>
    setDraft({
      ...draft,
      questions: draft.questions.map((item, i) => (i === index ? question : item)),
    });
  return (
    <form
      className="mt-4 grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (validation.success) onSave(settings, validation.data);
      }}
    >
      <label className="grid gap-1 text-sm">
        Quiz title
        <input
          className="rounded border border-slate-300 dark:border-slate-600 p-2"
          value={draft.title}
          required
          maxLength={200}
          disabled={busy}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
      </label>
      {draft.questions.map((question, index) => {
        const checked = quizQuestionSchema.safeParse(question),
          prefix = 'Question ' + (index + 1);
        return (
          <fieldset
            key={index}
            className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
            disabled={busy}
          >
            <legend className="px-2 font-semibold">
              {prefix} · {question.type.replaceAll('_', ' ')}
            </legend>
            <label className="grid gap-1 text-sm">
              {prefix} prompt
              <textarea
                className="min-h-20 rounded border border-slate-300 dark:border-slate-600 p-2"
                required
                maxLength={2000}
                value={question.prompt}
                onChange={(event) =>
                  change(index, { ...question, prompt: event.target.value })
                }
              />
            </label>
            {question.type === 'IDENTIFICATION' ? (
              <label className="grid gap-1 text-sm">
                {prefix} accepted answers (one per line)
                <textarea
                  className="min-h-24 rounded border border-slate-300 dark:border-slate-600 p-2"
                  value={question.acceptedAnswers.join('\n')}
                  onChange={(event) =>
                    change(index, {
                      ...question,
                      acceptedAnswers: event.target.value.split('\n'),
                    })
                  }
                />
              </label>
            ) : (
              <div className="grid gap-3">
                {question.options.map((option, position) => (
                  <div className="grid gap-2 sm:grid-cols-[auto_1fr]" key={option.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type={question.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                        name={'correct-' + index}
                        checked={question.correctOptionIds.includes(option.id)}
                        onChange={() =>
                          change(index, {
                            ...question,
                            correctOptionIds:
                              question.type === 'MULTIPLE_SELECT'
                                ? question.correctOptionIds.includes(option.id)
                                  ? question.correctOptionIds.filter(
                                      (id) => id !== option.id,
                                    )
                                  : [...question.correctOptionIds, option.id]
                                : [option.id],
                          })
                        }
                      />
                      {prefix} correct option {position + 1}
                    </label>
                    <label className="grid gap-1 text-sm">
                      {prefix} option {position + 1} text
                      <input
                        className="rounded border border-slate-300 dark:border-slate-600 p-2"
                        required
                        maxLength={1000}
                        value={option.text}
                        onChange={(event) =>
                          change(index, {
                            ...question,
                            options: question.options.map((item) =>
                              item.id === option.id
                                ? { ...item, text: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
            {settings.includeExplanations && (
              <label className="grid gap-1 text-sm">
                {prefix} explanation
                <textarea
                  className="min-h-20 rounded border border-slate-300 dark:border-slate-600 p-2"
                  required
                  maxLength={4000}
                  value={question.explanation ?? ''}
                  onChange={(event) =>
                    change(index, { ...question, explanation: event.target.value })
                  }
                />
              </label>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Source references: {question.sourceKeys.join(', ')}
            </p>
            {!checked.success && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                {prefix}: {checked.error.issues[0]!.message}
              </p>
            )}
          </fieldset>
        );
      })}
      {!validation.success && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          Fix the quiz before saving: {validation.error.issues[0]!.message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error.message}
        </p>
      )}
      <button
        className="w-fit rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
        disabled={busy || !validation.success}
      >
        {busy ? 'Saving…' : saveLabel}
      </button>
    </form>
  );
}
export default function QuizEditorPage() {
  const { quizId = '', versionId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid),
    cache = useQueryClient(),
    navigate = useNavigate();
  const meta = useQuery({
    queryKey: [uid, 'quiz', quizId],
    queryFn: ({ signal }) => quizzesApi.find(quizId, signal),
    staleTime: 30000,
  });
  const authoring = useQuery({
    queryKey: [uid, 'authoring', quizId, versionId],
    queryFn: ({ signal }) => quizzesApi.authoring(quizId, versionId, signal),
    staleTime: 30000,
  });
  const publish = useMutation({
    mutationFn: (input: { settings: QuizSettings; content: QuizDraft }) =>
      quizzesApi.publish(
        quizId,
        authoring.data!.data.version,
        input.settings,
        input.content,
      ),
    onSuccess: async (response) => {
      await Promise.all(
        ['quiz', 'quizzes', 'quiz-versions', 'dashboard', 'analytics'].map((domain) =>
          cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
      void navigate('/quizzes/' + quizId + '/versions/' + response.data.id + '/edit');
    },
  });
  return (
    <section>
      <Link
        className="text-sm text-teal-800 dark:text-teal-300 underline"
        to={meta.data ? '/projects/' + meta.data.data.projectId : '/'}
      >
        Back to project
      </Link>
      <AsyncState
        loading={meta.isPending || authoring.isPending}
        error={meta.error ?? authoring.error}
        retry={() => {
          void meta.refetch();
          void authoring.refetch();
        }}
      />
      {meta.data && authoring.data && (
        <>
          <h1 className="my-5 text-2xl font-semibold">
            Edit {meta.data.data.title} · version {authoring.data.data.version}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Publishing creates a new immutable version. Existing attempts retain their
            original questions and answers.
          </p>
          <QuizEditor
            key={authoring.data.data.id}
            initial={authoringDraft(authoring.data.data, meta.data.data.title)}
            sourceKeys={authoring.data.data.sources.map((source) => source.sourceKey)}
            onSave={(settings, content) => publish.mutate({ settings, content })}
            busy={publish.isPending}
            error={publish.error}
            saveLabel="Publish new version"
          />
        </>
      )}
    </section>
  );
}
