import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AIUsage } from '@/features/dashboard/AIUsage';
import { AsyncState } from '@/components/ui/AsyncState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGeneration } from './useGeneration';
import { SummaryFields } from './SummaryFields';
import { SummaryCopyExport } from './SummaryCopyExport';
import {
  summaryContentSchema,
  summaryFormats,
  summaryLengths,
  type SummaryContent,
  type SummarySettings,
  type Generation,
} from '@/types/study';
import type { SourceChoice } from '@/types/study-sources';
import { studyApi } from '@/api/study';
import { useSession } from '@/store/session';

const SummaryReader = lazy(() => import('./SummaryReader'));

function SummaryPreview({
  generation,
  linkSaved,
}: {
  generation: Generation;
  linkSaved: boolean;
}) {
  const initial = summaryContentSchema.safeParse(generation.result?.output);
  const [content, setContent] = useState<SummaryContent | null>(
    initial.success ? initial.data : null,
  );
  const [editing, setEditing] = useState(false);
  const uid = useSession((state) => state.user!.uid);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      studyApi.saveSummary(
        generation.result!.projectId,
        generation.id,
        summaryContentSchema.parse(content),
      ),
    onSuccess: (response) => {
      if (useSession.getState().user?.uid !== uid) return;
      cache.setQueryData([uid, 'summary', response.data.id], response);
      for (const domain of ['summaries', 'dashboard', 'analytics'])
        void cache.invalidateQueries({ queryKey: [uid, domain] });
    },
  });
  if (!content || !generation.result)
    return <p role="alert">The generated summary could not be read.</p>;
  return (
    <section
      className="mt-5 grid gap-4 border-t border-edge pt-5"
      aria-label="Summary preview"
    >
      <h3 className="text-xl font-semibold">{content.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="action action-primary"
          disabled={
            save.isPending ||
            save.isSuccess ||
            !summaryContentSchema.safeParse(content).success
          }
          onClick={() => save.mutate()}
        >
          {save.isSuccess ? 'Summary saved' : save.isPending ? 'Saving…' : 'Save summary'}
        </button>
        {save.data && linkSaved && (
          <Link to={'/summaries/' + save.data.data.id} className="action">
            Open saved summary
          </Link>
        )}
        {!save.isSuccess && (
          <button
            className="action"
            disabled={save.isPending}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Show reading preview' : 'Edit preview'}
          </button>
        )}
        <SummaryCopyExport content={content} />
      </div>
      {save.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {save.error.message}
        </p>
      )}
      {editing && !save.isSuccess ? (
        <SummaryFields content={content} onChange={setContent} />
      ) : (
        <Suspense fallback={<AsyncState loading error={null} retry={() => {}} />}>
          <SummaryReader content={content} sources={generation.result.sources} />
        </Suspense>
      )}
    </section>
  );
}

export function SummaryGenerator({
  projectId,
  choice,
  initialSettings,
  regenerateSummaryId,
  linkSaved = false,
}: {
  projectId: string;
  choice: SourceChoice | null;
  initialSettings?: SummarySettings | undefined;
  regenerateSummaryId?: string | undefined;
  linkSaved?: boolean | undefined;
}) {
  const [settings, setSettings] = useState<SummarySettings>(
    initialSettings ?? { length: 'MEDIUM', format: 'BULLETS' },
  );
  const generation = useGeneration(
    projectId,
    regenerateSummaryId ? { summaryId: regenerateSummaryId } : undefined,
  );
  const request =
    choice?.projectId === projectId
      ? { operation: 'SUMMARY' as const, source: choice.source, settings }
      : null;
  const terminal =
    generation.data &&
    ['SUCCEEDED', 'FAILED', 'UNCERTAIN'].includes(generation.data.status);
  return (
    <section className="surface p-4 sm:p-6" aria-label="Generate summary">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles size={19} aria-hidden="true" className="text-brand-text" />
        {regenerateSummaryId ? 'Generate a new version' : 'Generate a summary'}
      </h2>
      <AIUsage compact />
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Summary length
          <select
            className="field"
            value={settings.length}
            disabled={generation.pending}
            onChange={(event) =>
              setSettings({
                ...settings,
                length: event.target.value as SummarySettings['length'],
              })
            }
          >
            {Object.entries(summaryLengths).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Summary format
          <select
            className="field"
            value={settings.format}
            disabled={generation.pending}
            onChange={(event) =>
              setSettings({
                ...settings,
                format: event.target.value as SummarySettings['format'],
              })
            }
          >
            {Object.entries(summaryFormats).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-3 text-sm text-muted">
        {choice?.description ?? 'Choose sources first.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="action action-primary"
          disabled={!request || generation.pending}
          onClick={() => request && generation.generate(request)}
        >
          {generation.pending
            ? 'Generating…'
            : generation.error
              ? 'Retry original request'
              : 'Generate summary'}
        </button>
        {terminal && (
          <button
            className="action"
            disabled={!request || generation.pending}
            onClick={() => request && generation.generate(request, true)}
          >
            Generate another version (uses allowance)
          </button>
        )}
      </div>
      {generation.pending && <AsyncState loading error={null} retry={() => {}} />}
      {generation.error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {generation.error.message} Retry uses the same request key.
        </p>
      )}
      {generation.data && ['FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
        <p role="alert" className="mt-3 text-sm text-amber-800 dark:text-amber-200">
          Generation {generation.data.status.toLowerCase()}. A new version may use
          additional allowance.
        </p>
      )}
      {generation.data?.status === 'SUCCEEDED' && (
        <SummaryPreview
          key={generation.data.id}
          generation={generation.data}
          linkSaved={linkSaved}
        />
      )}
    </section>
  );
}
