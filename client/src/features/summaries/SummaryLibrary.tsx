import { useState } from 'react';
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
function SummaryText({ summary }: { summary: SavedSummary }) {
  return (
    <div className="grid gap-4">
      {summary.content.sections.map((section, index) => (
        <section key={index} className="rounded border border-slate-200 bg-white p-4">
          {section.heading && <h2 className="mb-2 font-semibold">{section.heading}</h2>}
          <p className="whitespace-pre-wrap">
            {summary.settings.format === 'BULLETS' ? '• ' : ''}
            {section.text}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Sources:{' '}
            {section.sourceKeys
              .map(
                (key) =>
                  summary.sources.find((source) => source.sourceKey === key)?.noteTitle ??
                  key,
              )
              .join(', ')}
          </p>
        </section>
      ))}
    </div>
  );
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
      <label className="grid gap-1 text-sm">
        Summary title
        <input
          className="rounded border border-slate-300 p-2"
          required
          maxLength={200}
          value={content.title}
          onChange={(event) => setContent({ ...content, title: event.target.value })}
        />
      </label>
      {content.sections.map((section, index) => (
        <label key={index} className="grid gap-1 text-sm">
          Section {index + 1} text
          <textarea
            className="min-h-28 rounded border border-slate-300 p-2"
            required
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
      ))}
      <div className="flex gap-3">
        <button
          className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={save.isPending || !summaryContentSchema.safeParse(content).success}
        >
          Save changes
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-4 py-2"
          disabled={save.isPending}
          onClick={onClose}
        >
          Cancel editing
        </button>
      </div>
      {save.error && (
        <p role="alert" className="text-red-700">
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
  const summary = useQuery({
    queryKey: [uid, 'summary', summaryId],
    queryFn: ({ signal }) => summariesApi.find(summaryId, signal),
    staleTime: 30000,
  });
  const remove = useMutation({
    mutationFn: () => summariesApi.remove(summaryId),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: [uid, 'summaries'] });
      void navigate('/projects/' + summary.data!.data.projectId + '/summaries');
    },
  });
  const data = summary.data?.data;
  return (
    <section>
      <AsyncState
        loading={summary.isPending}
        error={summary.error}
        retry={() => void summary.refetch()}
      />
      {data && (
        <>
          <Link
            className="text-sm text-teal-800 underline"
            to={'/projects/' + data.projectId + '/summaries'}
          >
            Back to summaries
          </Link>
          <h1 className="my-4 text-2xl font-semibold">{data.title}</h1>
          <p className="mb-4 text-sm text-slate-600">
            Generated {new Date(data.generatedAt).toLocaleString()} ·{' '}
            {data.settings.length} · {data.settings.format}
          </p>
          {data.staleSources && (
            <p
              role="status"
              className="mb-4 rounded border border-amber-300 bg-amber-50 p-3"
            >
              Sources changed or were removed. This saved summary retains the captured
              revisions.
            </p>
          )}
          <div className="mb-5 flex gap-4">
            <button className="underline" onClick={() => setEditing(true)}>
              Edit summary
            </button>
            <button className="underline" onClick={() => setDeleting(true)}>
              Delete summary
            </button>
          </div>
          {editing ? (
            <SummaryEdit
              key={data.updatedAt}
              summary={data}
              onClose={() => setEditing(false)}
            />
          ) : (
            <SummaryText summary={data} />
          )}
          <ul className="mt-5 text-xs text-slate-600">
            {data.sources.map((source) => (
              <li key={source.sourceKey}>
                {source.noteTitle} · revision {source.revision}
                {source.stale ? ' · changed' : ''}
              </li>
            ))}
          </ul>
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
                <p role="alert" className="mt-3 text-red-700">
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
    <section>
      <Link className="text-sm text-teal-800 underline" to={'/projects/' + projectId}>
        Back to project
      </Link>
      <h1 className="my-5 text-2xl font-semibold">Saved summaries</h1>
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
          <li
            key={summary.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <Link
              className="font-semibold text-teal-800 underline"
              to={'/summaries/' + summary.id}
            >
              {summary.title}
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              {new Date(summary.generatedAt).toLocaleString()} · {summary.sources.length}{' '}
              sources
            </p>
            {summary.staleSources && (
              <p className="mt-1 text-sm text-amber-800">Sources changed</p>
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
