import { useState } from 'react';
import { useGeneration } from '@/features/summaries/useGeneration';
import {
  quizSettingsSchema,
  questionTypeSchema,
  type QuizSettings,
} from '@/types/quiz-settings';
import { quizResultSchema } from '@/types/quiz';
import type { SourceChoice } from '@/types/study-sources';
import type { Generation } from '@/types/study';
function QuizPreview({ generation }: { generation: Generation }) {
  const settings = quizSettingsSchema.safeParse(generation.result?.settings);
  const draft = settings.success
    ? quizResultSchema(
        settings.data,
        generation.result!.sources.map((s) => s.sourceKey),
      ).safeParse(generation.result!.output)
    : null;
  if (!draft?.success)
    return (
      <p role="alert">
        This quiz preview could not be validated. Your notes are unchanged.
      </p>
    );
  return (
    <section className="mt-5" aria-label="Quiz preview">
      <h3 className="text-lg font-semibold">{draft.data.title}</h3>
      <ol className="mt-3 grid gap-3">
        {draft.data.questions.map((question, index) => (
          <li key={index} className="rounded border border-slate-200 p-3">
            <p className="font-medium">
              {index + 1}. {question.prompt}
            </p>
            {question.type === 'IDENTIFICATION' ? (
              <p className="mt-2 text-sm">
                Accepted answers: {question.acceptedAnswers.join(', ')}
              </p>
            ) : (
              <ul className="mt-2 text-sm">
                {question.options.map((option) => (
                  <li key={option.id}>
                    {question.correctOptionIds.includes(option.id) ? 'Correct: ' : ''}
                    {option.text}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Sources:{' '}
              {question.sourceKeys
                .map(
                  (key) =>
                    generation.result!.sources.find((source) => source.sourceKey === key)
                      ?.noteTitle ?? key,
                )
                .join(', ')}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function QuizGenerator({
  projectId,
  choice,
}: {
  projectId: string;
  choice: SourceChoice | null;
}) {
  const [settings, setSettings] = useState<QuizSettings>({
    title: '',
    questionCount: 10,
    difficulty: 'EASY',
    questionTypes: ['MULTIPLE_CHOICE'],
    defaultMode: 'PRACTICE',
    includeExplanations: true,
  });
  const [validation, setValidation] = useState('');
  const generation = useGeneration(projectId);
  const ready = choice?.projectId === projectId;
  const submit = (fresh = false) => {
    const parsed = quizSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]!.message);
      return;
    }
    if (!choice || !ready) return;
    setValidation('');
    generation.generate(
      { operation: 'QUIZ', source: choice.source, settings: parsed.data },
      fresh,
    );
  };
  return (
    <section
      className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
      aria-label="Generate quiz"
    >
      <h2 className="font-semibold">Generate a quiz</h2>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="grid gap-1 text-sm">
          Quiz title
          <input
            className="rounded border border-slate-300 p-2"
            required
            maxLength={200}
            value={settings.title}
            onChange={(event) => setSettings({ ...settings, title: event.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Questions
            <input
              className="rounded border border-slate-300 p-2"
              type="number"
              min={1}
              max={50}
              required
              value={settings.questionCount}
              onChange={(event) =>
                setSettings({ ...settings, questionCount: Number(event.target.value) })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            Difficulty
            <select
              className="rounded border border-slate-300 p-2"
              value={settings.difficulty}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  difficulty: event.target.value as QuizSettings['difficulty'],
                })
              }
            >
              {['EASY', 'MEDIUM', 'HARD'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Default mode
            <select
              className="rounded border border-slate-300 p-2"
              value={settings.defaultMode}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  defaultMode: event.target.value as QuizSettings['defaultMode'],
                })
              }
            >
              <option>PRACTICE</option>
              <option>EXAM</option>
            </select>
          </label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Question types</legend>
          {questionTypeSchema.options.map((type) => (
            <label className="flex items-center gap-2 text-sm" key={type}>
              <input
                type="checkbox"
                checked={settings.questionTypes.includes(type)}
                onChange={() =>
                  setSettings({
                    ...settings,
                    questionTypes: settings.questionTypes.includes(type)
                      ? settings.questionTypes.filter((value) => value !== type)
                      : [...settings.questionTypes, type],
                  })
                }
              />
              {type.replaceAll('_', ' ')}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.includeExplanations}
            onChange={(event) =>
              setSettings({ ...settings, includeExplanations: event.target.checked })
            }
          />
          Include explanations
        </label>
        <p className="text-sm text-slate-600">
          {choice?.description ?? 'Choose sources first.'} Generation uses your AI
          allowance and preserves saved notes.
        </p>
        <button
          className="w-fit rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={!ready || generation.pending}
        >
          {generation.pending
            ? 'Generating…'
            : generation.error
              ? 'Retry original quiz request'
              : 'Generate quiz'}
        </button>
      </form>
      {validation && (
        <p role="alert" className="mt-3 text-red-700">
          {validation}
        </p>
      )}
      {generation.error && (
        <p role="alert" className="mt-3 text-red-700">
          {generation.error.message} The same request key is retained.
        </p>
      )}
      {generation.pending && (
        <p role="status" className="mt-3">
          Quiz generation is running. Your form is retained.
        </p>
      )}
      {generation.data && ['FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
        <p role="alert" className="mt-3">
          Generation {generation.data.status.toLowerCase()}. Your form and sources are
          retained.
        </p>
      )}
      {generation.data &&
        ['SUCCEEDED', 'FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
          <button
            className="mt-3 rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
            disabled={!ready || generation.pending}
            onClick={() => submit(true)}
          >
            Generate another quiz (uses allowance)
          </button>
        )}
      {generation.data?.status === 'SUCCEEDED' && (
        <QuizPreview key={generation.data.id} generation={generation.data} />
      )}
    </section>
  );
}
