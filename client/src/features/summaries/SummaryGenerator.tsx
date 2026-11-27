import { useState } from 'react';
import { AIUsage } from '@/features/dashboard/AIUsage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGeneration } from './useGeneration';
import {
  summaryContentSchema,
  type SummaryContent,
  type SummarySettings,
  type Generation,
} from '@/types/study';
import type { SourceChoice } from '@/types/study-sources';
import { studyApi } from '@/api/study';
import { useSession } from '@/store/session';
function SummaryPreview({ generation }: { generation: Generation }) {
  const initial = summaryContentSchema.safeParse(generation.result?.output);
  const [content, setContent] = useState<SummaryContent | null>(
    initial.success ? initial.data : null,
  );
  const [copyMessage, setCopyMessage] = useState('');
  const uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      studyApi.saveSummary(
        generation.result!.projectId,
        generation.id,
        summaryContentSchema.parse(content),
      ),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: [uid, 'summaries'] });
      void cache.invalidateQueries({ queryKey: [uid, 'dashboard'] });
    },
  });
  if (!content)
    return (
      <p role="alert">
        The returned summary could not be read. Your notes were not changed.
      </p>
    );
  return (
    <section className="mt-5 grid gap-4" aria-label="Summary preview">
      <h3 className="text-lg font-semibold">Summary preview</h3>
      <label className="grid gap-1 text-sm">
        Summary title
        <input
          className="rounded border border-slate-300 p-2"
          maxLength={200}
          value={content.title}
          onChange={(event) => setContent({ ...content, title: event.target.value })}
        />
      </label>
      {content.sections.map((section, index) => (
        <div key={index} className="grid gap-2 rounded border border-slate-200 p-3">
          <label className="grid gap-1 text-sm">
            Section {index + 1} heading
            <input
              className="rounded border border-slate-300 p-2"
              maxLength={200}
              value={section.heading ?? ''}
              onChange={(event) =>
                setContent({
                  ...content,
                  sections: content.sections.map((item, i) =>
                    i === index ? { ...item, heading: event.target.value || null } : item,
                  ),
                })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            Section {index + 1} text
            <textarea
              className="min-h-28 rounded border border-slate-300 p-2"
              maxLength={16000}
              value={section.text}
              onChange={(event) =>
                setContent({
                  ...content,
                  sections: content.sections.map((item, i) =>
                    i === index ? { ...item, text: event.target.value } : item,
                  ),
                })
              }
            />
          </label>
          <p className="text-xs text-slate-600">
            Sources:{' '}
            {section.sourceKeys
              .map(
                (key) =>
                  generation.result!.sources.find((source) => source.sourceKey === key)
                    ?.noteTitle ?? key,
              )
              .join(', ')}
          </p>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={
            save.isPending ||
            save.isSuccess ||
            !summaryContentSchema.safeParse(content).success
          }
          onClick={() => save.mutate()}
        >
          {save.isSuccess ? 'Summary saved' : 'Save summary'}
        </button>
        <button
          className="rounded border border-slate-300 px-4 py-2"
          onClick={() =>
            void navigator.clipboard
              .writeText(
                [
                  content.title,
                  ...content.sections.map((section) =>
                    [section.heading, section.text].filter(Boolean).join('\n'),
                  ),
                ].join('\n\n'),
              )
              .then(() => setCopyMessage('Summary copied.'))
              .catch(() =>
                setCopyMessage('Copy is unavailable. Select and copy the preview text.'),
              )
          }
        >
          Copy summary
        </button>
      </div>
      {copyMessage && <p role="status">{copyMessage}</p>}
      {save.error && (
        <p role="alert" className="text-red-700">
          {save.error.message}
        </p>
      )}
    </section>
  );
}
export function SummaryGenerator({
  projectId,
  choice,
}: {
  projectId: string;
  choice: SourceChoice | null;
}) {
  const [settings, setSettings] = useState<SummarySettings>({
    length: 'MEDIUM',
    format: 'BULLETS',
  });
  const generation = useGeneration(projectId);
  const request =
    choice?.projectId === projectId
      ? { operation: 'SUMMARY' as const, source: choice.source, settings }
      : null;
  return (
    <section
      className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
      aria-label="Generate summary"
    >
      <h2 className="font-semibold">Generate a summary</h2>
      <AIUsage compact />
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Summary length
          <select
            className="rounded border border-slate-300 p-2"
            value={settings.length}
            onChange={(event) =>
              setSettings({
                ...settings,
                length: event.target.value as SummarySettings['length'],
              })
            }
          >
            {['SHORT', 'MEDIUM', 'DETAILED'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Summary format
          <select
            className="rounded border border-slate-300 p-2"
            value={settings.format}
            onChange={(event) =>
              setSettings({
                ...settings,
                format: event.target.value as SummarySettings['format'],
              })
            }
          >
            {['PARAGRAPHS', 'BULLETS', 'KEY_CONCEPTS', 'STUDY_GUIDE'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        {choice?.description ?? 'Choose sources first.'} Generation uses your AI allowance
        and keeps your notes unchanged.
      </p>
      <button
        className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
        disabled={!request || generation.pending}
        onClick={() => request && generation.generate(request)}
      >
        {generation.pending
          ? 'Generating…'
          : generation.error
            ? 'Retry original request'
            : 'Generate summary'}
      </button>
      {generation.data &&
        ['SUCCEEDED', 'FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
          <button
            className="ml-3 rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
            disabled={!request || generation.pending}
            onClick={() => request && generation.generate(request, true)}
          >
            Generate another version (uses allowance)
          </button>
        )}
      {generation.pending && (
        <p role="status" className="mt-3">
          Generation is running. Your source and settings are retained.
        </p>
      )}
      {generation.error && (
        <p role="alert" className="mt-3 text-red-700">
          {generation.error.message} Retry keeps the same request key to avoid duplicate
          usage.
        </p>
      )}
      {generation.data && ['FAILED', 'UNCERTAIN'].includes(generation.data.status) && (
        <p role="alert" className="mt-3 text-amber-800">
          Generation {generation.data.status.toLowerCase()}. Your notes and settings are
          retained. A new version may use additional allowance.
        </p>
      )}
      {generation.data?.status === 'SUCCEEDED' && (
        <SummaryPreview key={generation.data.id} generation={generation.data} />
      )}
    </section>
  );
}
