import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { summariesApi } from '@/api/summaries';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import {
  summaryContentSchema,
  type SummaryContent,
  type SavedSummary,
} from '@/types/study';
import { BookOpen, FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { SummaryCopyExport } from './SummaryCopyExport';
import { SummaryFields } from './SummaryFields';
import { SummaryGenerator } from './SummaryGenerator';
import { summaryFormats, summaryLengths, type SummarySettings } from '@/types/study';
import type { SourceChoice } from '@/types/study-sources';

const SummaryReader = lazy(() => import('./SummaryReader'));

function rebuildChoice(summary: SavedSummary): SourceChoice | null {
  const { sources, projectId } = summary;
  const noteIds = [
    ...new Set(sources.flatMap((source) => (source.noteId ? [source.noteId] : []))),
  ];
  if (!sources.length || sources.some((source) => !source.noteId)) return null;
  const first = sources[0];
  if (
    sources.length === 1 &&
    first?.noteId &&
    first.rangeStart !== null &&
    first.rangeEnd !== null
  ) {
    return {
      projectId,
      source: {
        scope: 'EXCERPT',
        noteId: first.noteId,
        revision: first.revision,
        start: first.rangeStart,
        end: first.rangeEnd,
      },
      description: 'Original passage from ' + first.noteTitle,
    };
  }
  return {
    projectId,
    source: { scope: 'NOTES', noteIds },
    description: 'Current text of the original study notes',
  };
}
function SummaryEdit({
  summary,
  onClose,
}: {
  summary: SavedSummary;
  onClose: () => void;
}) {
  const [content, setContent] = useState<SummaryContent>(summary.content);
  const uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const save = useMutation({
    mutationFn: () => summariesApi.update(summary.id, { title: content.title, content }),
    onSuccess: async () => {
      await Promise.all(
        ['summary', 'summaries', 'dashboard'].map((domain) =>
          cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
      onClose();
    },
  });
  return (
    <form
      className="my-4 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <SummaryFields content={content} onChange={setContent} />
      <div className="flex gap-3">
        <button
          className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={save.isPending || !summaryContentSchema.safeParse(content).success}
        >
          Save changes
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 dark:border-slate-600 px-4 py-2"
          disabled={save.isPending}
          onClick={onClose}
        >
          Cancel editing
        </button>
      </div>
      {save.error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {save.error.message}
        </p>
      )}
    </form>
  );
}
export function SummaryDetail() {
  const { summaryId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid),
    cache = useQueryClient(),
    navigate = useNavigate();
  const [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState<SummarySettings | null>(null);
  const summary = useQuery({
    queryKey: [uid, 'summary', summaryId],
    queryFn: ({ signal }) => summariesApi.find(summaryId, signal),
    staleTime: 30000,
  });
  const remove = useMutation({
    mutationFn: () => summariesApi.remove(summaryId),
    onSuccess: async () => {
      await Promise.all(
        ['summaries', 'summary', 'dashboard', 'analytics'].map((domain) =>
          cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
      void navigate('/projects/' + summary.data!.data.projectId + '/summaries');
    },
  });
  const data = summary.data?.data;
  const choice = data ? rebuildChoice(data) : null;
  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <AsyncState
        loading={summary.isPending}
        error={summary.error}
        retry={() => void summary.refetch()}
      />
      {data && (
        <>
          <Link
            className="text-sm text-teal-800 dark:text-teal-300 underline"
            to={'/projects/' + data.projectId + '/summaries'}
          >
            Back to summaries
          </Link>
          <h1 className="page-title">{data.title}</h1>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Generated {new Date(data.generatedAt).toLocaleString()} ·{' '}
            {summaryLengths[data.settings.length]} ·{' '}
            {summaryFormats[data.settings.format]}
          </p>
          {data.staleSources && (
            <p
              role="status"
              className="mb-4 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3"
            >
              Sources changed or were removed. This saved summary retains the captured
              revisions.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <SummaryCopyExport content={data.content} />
            <button className="action" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" />
              Edit summary
            </button>
            <button className="action" onClick={() => setGenerating(data.settings)}>
              <RefreshCw size={16} aria-hidden="true" />
              Regenerate or change format
            </button>
            <button
              className="action"
              onClick={() => setGenerating({ length: 'SHORT', format: 'SIMPLIFIED' })}
            >
              Simplify
            </button>
            <button
              className="action"
              onClick={() => setGenerating({ length: 'DETAILED', format: 'PARAGRAPHS' })}
            >
              Expand
            </button>
            <button
              className="action text-red-700 dark:text-red-300"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete summary
            </button>
          </div>
          {generating && (
            <div className="grid gap-3">
              <button className="action w-fit" onClick={() => setGenerating(null)}>
                Close generation settings
              </button>
              {choice ? (
                <SummaryGenerator
                  key={generating.format + ':' + generating.length}
                  projectId={data.projectId}
                  regenerateSummaryId={data.id}
                  choice={choice}
                  initialSettings={generating}
                  linkSaved
                />
              ) : (
                <p role="status" className="surface p-4">
                  Choose current notes in the{' '}
                  <Link
                    className="text-brand-text underline"
                    to={'/projects/' + data.projectId}
                  >
                    source project
                  </Link>{' '}
                  to generate a new version.
                </p>
              )}
            </div>
          )}
          {editing ? (
            <SummaryEdit
              key={data.updatedAt}
              summary={data}
              onClose={() => setEditing(false)}
            />
          ) : (
            <Suspense fallback={<AsyncState loading error={null} retry={() => {}} />}>
              <SummaryReader
                content={data.content}
                sources={data.sources}
                projectId={data.projectId}
              />
            </Suspense>
          )}
          <Link className="action w-fit" to={'/projects/' + data.projectId}>
            <BookOpen size={16} aria-hidden="true" />
            Open source project
          </Link>
          {deleting && (
            <Modal
              title={'Delete ' + data.title + '?'}
              busy={remove.isPending}
              onClose={() => setDeleting(false)}
            >
              <p>The saved summary will leave your library. Your notes stay available.</p>
              <div className="mt-4 flex gap-4">
                <button
                  className="rounded bg-red-800 px-4 py-2 text-white disabled:opacity-50"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Confirm deletion
                </button>
                <button
                  disabled={remove.isPending}
                  className="underline"
                  onClick={() => setDeleting(false)}
                >
                  Cancel
                </button>
              </div>
              {remove.error && (
                <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
                  {remove.error.message}
                </p>
              )}
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
export default function SummaryLibrary() {
  const { projectId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid);
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: [uid, 'summaries', projectId, page],
    queryFn: ({ signal }) => summariesApi.list(projectId, page, signal),
    staleTime: 30000,
  });
  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <Link
        className="text-sm text-teal-800 dark:text-teal-300 underline"
        to={'/projects/' + projectId}
      >
        Back to project
      </Link>
      <h1 className="page-title">Saved summaries</h1>
      <AsyncState
        loading={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
        empty={
          history.data?.total === 0
            ? 'No saved summaries yet. Choose project sources to generate one.'
            : undefined
        }
      />
      <ul className="grid gap-3">
        {history.data?.data.map((summary) => (
          <li key={summary.id} className="surface p-5">
            <Link
              className="font-semibold text-teal-800 dark:text-teal-300 underline"
              to={'/summaries/' + summary.id}
            >
              <FileText size={17} aria-hidden="true" className="mr-1.5 inline" />
              {summary.title}
            </Link>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {new Date(summary.generatedAt).toLocaleString()} · {summary.sources.length}{' '}
              sources
            </p>
            {summary.staleSources && (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Sources changed
              </p>
            )}
          </li>
        ))}
      </ul>
      {history.data && (
        <Pagination
          page={page}
          pageSize={12}
          total={history.data.total}
          onChange={setPage}
        />
      )}
    </section>
  );
}
