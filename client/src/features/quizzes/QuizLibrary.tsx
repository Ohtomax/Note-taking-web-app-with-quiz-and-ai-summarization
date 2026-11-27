import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizzesApi } from '@/api/quizzes';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { QuizGenerator } from './QuizGenerator';
import { authoringDraft } from '@/types/quiz-library';
import type { SourceChoice } from '@/types/study-sources';
import { OpenAttempts } from './ResumeAttempt';
import { StartAttempt } from './StartAttempt';
export function QuizDetail() {
  const [params] = useSearchParams();
  const { quizId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid);
  const [page, setPage] = useState(1),
    [regenerating, setRegenerating] = useState(params.get('regenerate') === 'true');
  const quiz = useQuery({
    queryKey: [uid, 'quiz', quizId],
    queryFn: ({ signal }) => quizzesApi.find(quizId, signal),
    staleTime: 30000,
  });
  const versions = useQuery({
    queryKey: [uid, 'quiz-versions', quizId, page],
    queryFn: ({ signal }) => quizzesApi.versions(quizId, page, signal),
    staleTime: 30000,
  });
  const latest = versions.data?.data[0];
  const authoring = useQuery({
    queryKey: [uid, 'authoring', quizId, latest?.id],
    queryFn: ({ signal }) => quizzesApi.authoring(quizId, latest!.id, signal),
    enabled: regenerating && Boolean(latest),
    staleTime: 30000,
  });
  const data = quiz.data?.data,
    version = authoring.data?.data;
  let choice: SourceChoice | null = null;
  if (data && version && version.sources.every((source) => source.noteId)) {
    const sources = version.sources,
      first = sources[0];
    if (first)
      choice = {
        projectId: data.projectId,
        description:
          'Current saved sources: ' +
          sources
            .map(
              (source) =>
                source.noteTitle + ' (captured revision ' + source.revision + ')',
            )
            .join(', '),
        source:
          sources.length === 1 && first.rangeStart !== null && first.rangeEnd !== null
            ? {
                scope: 'EXCERPT',
                noteId: first.noteId!,
                revision: first.revision,
                start: first.rangeStart,
                end: first.rangeEnd,
              }
            : { scope: 'NOTES', noteIds: sources.map((source) => source.noteId!) },
      };
  }
  return (
    <section>
      <AsyncState
        loading={quiz.isPending || versions.isPending}
        error={quiz.error ?? versions.error}
        retry={() => {
          void quiz.refetch();
          void versions.refetch();
        }}
      />
      {data && (
        <>
          <Link
            className="text-sm text-teal-800 dark:text-teal-300 underline"
            to={'/projects/' + data.projectId + '/quizzes'}
          >
            Back to quizzes
          </Link>
          <Link
            className="text-teal-800 dark:text-teal-300 underline"
            to={'/quizzes/' + quizId + '/analytics'}
          >
            Quiz analytics
          </Link>
          <h1 className="my-5 text-2xl font-semibold">{data.title}</h1>
          <OpenAttempts quizId={quizId} />
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Each version preserves its own questions and key. Existing attempts retain
            their recorded version.
          </p>
          <button
            className="mb-4 rounded border border-slate-300 dark:border-slate-600 px-3 py-2"
            onClick={() => setRegenerating((value) => !value)}
          >
            {regenerating ? 'Close regeneration' : 'Regenerate from saved sources'}
          </button>
          {regenerating && (
            <div className="mb-5">
              <AsyncState
                loading={authoring.isPending}
                error={authoring.error}
                retry={() => void authoring.refetch()}
              />
              {version && (
                <>
                  <ul className="mb-3 text-sm">
                    {version.sources.map((source) => (
                      <li key={source.sourceKey}>
                        {source.noteTitle} · captured revision {source.revision}
                        {source.rangeStart !== null ? ' · selected passage' : ''}
                      </li>
                    ))}
                  </ul>
                  {choice ? (
                    <QuizGenerator
                      key={version.id}
                      projectId={data.projectId}
                      choice={choice}
                      initialSettings={authoringDraft(version, data.title).settings}
                      target={{ quizId, expectedVersion: version.version }}
                    />
                  ) : (
                    <p role="alert">
                      Some sources are unavailable. Choose current material from the
                      project to generate a new quiz.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <ol className="grid gap-3">
            {versions.data?.data.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
              >
                <h2 className="font-semibold">Version {item.version}</h2>
                <StartAttempt
                  quizId={quizId}
                  versionId={item.id}
                  version={item.version}
                />
                <p className="my-2 text-sm text-slate-600 dark:text-slate-300">
                  {item.difficulty} · {item._count.questions} questions ·{' '}
                  {new Date(item.generatedAt).toLocaleString()}
                </p>
                <Link
                  className="text-teal-800 dark:text-teal-300 underline"
                  to={'/quizzes/' + quizId + '/versions/' + item.id + '/edit'}
                >
                  Review or edit version {item.version}
                </Link>
              </li>
            ))}
          </ol>
          {versions.data && (
            <Pagination
              page={page}
              pageSize={12}
              total={versions.data.total}
              onChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}
export default function QuizLibrary() {
  const { projectId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [editing, setEditing] = useState<{ id: string; title: string } | null>(null),
    [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const library = useQuery({
    queryKey: [uid, 'quizzes', projectId, page, search],
    queryFn: ({ signal }) => quizzesApi.list(projectId, page, search, signal),
    staleTime: 30000,
  });
  const refresh = async () => {
    await Promise.all(
      ['quizzes', 'quiz', 'quiz-versions', 'dashboard'].map((domain) =>
        cache.invalidateQueries({ queryKey: [uid, domain] }),
      ),
    );
  };
  const rename = useMutation({
    mutationFn: (input: { id: string; title: string }) =>
      quizzesApi.rename(input.id, input.title),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
    },
  });
  const duplicate = useMutation({
    mutationFn: (input: { id: string; version: number }) =>
      quizzesApi.duplicate(input.id, input.version),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => quizzesApi.remove(id),
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
    },
  });
  return (
    <section>
      <Link
        className="text-sm text-teal-800 dark:text-teal-300 underline"
        to={'/projects/' + projectId}
      >
        Back to project
      </Link>
      <h1 className="my-5 text-2xl font-semibold">Saved quizzes</h1>
      <label className="mb-4 grid gap-1 text-sm">
        Search quizzes
        <input
          type="search"
          className="rounded border border-slate-300 dark:border-slate-600 p-3"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </label>
      <AsyncState
        loading={library.isPending}
        error={library.error}
        retry={() => void library.refetch()}
        empty={
          library.data?.total === 0
            ? 'No saved quizzes found. Choose project sources to generate one.'
            : undefined
        }
      />
      <ul className="grid gap-3">
        {library.data?.data.map((quiz) => (
          <li
            key={quiz.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
          >
            <Link
              className="font-semibold text-teal-800 dark:text-teal-300 underline"
              to={'/quizzes/' + quiz.id}
            >
              {quiz.title}
            </Link>
            <p className="my-3 text-sm text-slate-600 dark:text-slate-300">
              Latest version {quiz.versions[0]?.version ?? 'unavailable'} ·{' '}
              {quiz.versions[0]?._count.questions ?? 0} questions
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="underline"
                onClick={() => {
                  rename.reset();
                  setEditing({ id: quiz.id, title: quiz.title });
                }}
              >
                Rename
              </button>
              <button
                className="underline disabled:opacity-50"
                disabled={duplicate.isPending || !quiz.versions[0]}
                onClick={() =>
                  duplicate.mutate({ id: quiz.id, version: quiz.versions[0]!.version })
                }
              >
                Duplicate {quiz.title}
              </button>
              <button
                className="underline"
                onClick={() => setDeleting({ id: quiz.id, title: quiz.title })}
              >
                Delete {quiz.title}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {duplicate.error && (
        <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
          {duplicate.error.message}
        </p>
      )}
      {library.data && (
        <Pagination
          page={page}
          pageSize={12}
          total={library.data.total}
          onChange={setPage}
        />
      )}
      {editing && (
        <Modal
          title="Rename quiz"
          busy={rename.isPending}
          onClose={() => setEditing(null)}
        >
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              rename.mutate(editing);
            }}
          >
            <label className="grid gap-1 text-sm">
              Quiz title
              <input
                className="rounded border border-slate-300 dark:border-slate-600 p-2"
                required
                maxLength={200}
                value={editing.title}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <button
              className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
              disabled={rename.isPending}
            >
              Save name
            </button>
            {rename.error && <p role="alert">{rename.error.message}</p>}
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={'Delete ' + deleting.title + '?'}
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <p>
            Remove this quiz from active listings? Historical attempts retain their
            recorded versions and results.
          </p>
          <div className="mt-4 flex gap-4">
            <button
              className="rounded bg-red-800 px-4 py-2 text-white disabled:opacity-50"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
            >
              Confirm deletion
            </button>
            <button
              className="underline"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
          </div>
          {remove.error && <p role="alert">{remove.error.message}</p>}
        </Modal>
      )}
    </section>
  );
}
