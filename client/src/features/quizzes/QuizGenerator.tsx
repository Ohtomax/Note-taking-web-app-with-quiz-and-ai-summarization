import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AsyncState } from '@/components/ui/AsyncState';
import { AIUsage } from '@/features/dashboard/AIUsage';
import { useGeneration } from '@/features/summaries/useGeneration';
import {
  quizSettingsSchema,
  questionTypeSchema,
  type QuizSettings,
} from '@/types/quiz-settings';
import { GeneratedQuizEditor } from './GeneratedQuizEditor';
import type { SourceChoice } from '@/types/study-sources';
import type { QuizRegenerationTarget } from '@/types/quiz-library';

const counts = [5, 10, 15, 20, 30];
const types = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True or false',
  IDENTIFICATION: 'Identification',
  MULTIPLE_SELECT: 'Multiple select',
};
const mixedTypes: QuizSettings['questionTypes'] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'IDENTIFICATION',
];

export function QuizGenerator({
  projectId,
  choice,
  initialSettings,
  target,
}: {
  projectId: string;
  choice: SourceChoice | null;
  initialSettings?: QuizSettings | undefined;
  target?: QuizRegenerationTarget | undefined;
}) {
  const [settings, setSettings] = useState<QuizSettings>(
    initialSettings ?? {
      title: '',
      questionCount: 10,
      difficulty: 'MEDIUM',
      questionTypes: ['MULTIPLE_CHOICE'],
      defaultMode: 'EXAM',
      includeExplanations: true,
    },
  );
  const [validation, setValidation] = useState('');
  const generation = useGeneration(projectId, target?.quizId);
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
    <section className="surface p-5 sm:p-6" aria-label="Generate quiz">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles size={18} aria-hidden="true" className="text-brand-text" />
        Generate a quiz
      </h2>
      <AIUsage compact />
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
            className="field"
            required
            maxLength={200}
            value={settings.title}
            onChange={(event) => setSettings({ ...settings, title: event.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Questions
            <select
              className="field"
              value={settings.questionCount}
              onChange={(event) =>
                setSettings({ ...settings, questionCount: Number(event.target.value) })
              }
            >
              {!counts.includes(settings.questionCount) && (
                <option>{settings.questionCount}</option>
              )}
              {counts.map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Difficulty
            <select
              className="field"
              value={settings.difficulty}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  difficulty: event.target.value as QuizSettings['difficulty'],
                })
              }
            >
              {['EASY', 'MEDIUM', 'HARD', 'MIXED'].map((value) => (
                <option key={value} value={value}>
                  {value[0] + value.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Default mode
            <select
              className="field"
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
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-medium">Question types</legend>
          <button
            type="button"
            className="action aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-text"
            aria-pressed={
              settings.questionTypes.length === mixedTypes.length &&
              mixedTypes.every((type) => settings.questionTypes.includes(type))
            }
            onClick={() => setSettings({ ...settings, questionTypes: mixedTypes })}
          >
            Mixed
          </button>
          {questionTypeSchema.options.map((type) => (
            <label
              className="action cursor-pointer has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand-text"
              key={type}
            >
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
              {types[type]}
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
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {choice?.description ?? 'Choose sources first.'} Generation uses your AI
          allowance and preserves saved notes.
        </p>
        <button
          className="action action-primary w-fit"
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
        <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
          {validation}
        </p>
      )}
      {generation.error && (
        <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
          {generation.error.message} The same request key is retained.
        </p>
      )}
      {generation.pending && <AsyncState loading error={null} retry={() => {}} />}
      {generation.data && ['FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
        <p role="alert" className="mt-3">
          Generation {generation.data.status.toLowerCase()}. Your form and sources are
          retained.
        </p>
      )}
      {generation.data &&
        ['SUCCEEDED', 'FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
          <button
            className="mt-3 rounded border border-slate-300 dark:border-slate-600 px-3 py-2 disabled:opacity-50"
            disabled={!ready || generation.pending}
            onClick={() => submit(true)}
          >
            Generate another quiz (uses allowance)
          </button>
        )}
      {generation.data?.status === 'SUCCEEDED' && (
        <GeneratedQuizEditor
          key={generation.data.id}
          generation={generation.data}
          target={target}
        />
      )}
    </section>
  );
}
