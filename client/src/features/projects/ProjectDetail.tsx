import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProject, useProjects } from './useProjects';
import { useNotes, useNoteMutation } from '@/features/notes/useNotes';
import { notesApi } from '@/api/notes';
import { AsyncState } from '@/components/ui/AsyncState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { initialQuery } from './project-display';
import type { NoteItem, ListQuery } from '@/types/workspace';
import { StudySources } from '@/features/notes/StudySources';

function MoveNoteDialog({ note, onClose }: { note: NoteItem; onClose: () => void }) {
  const [query, setQuery] = useState(initialQuery);
  const projects = useProjects(query);
  const move = useNoteMutation((destination: string) => notesApi.move(note, destination));
  return (
    <Modal title={`Move ${note.title}`} onClose={onClose} busy={move.isPending}>
      <label className="grid gap-2 text-sm">
        Find a destination
        <input
          className="rounded border border-slate-300 p-2"
          type="search"
          value={query.search}
          onChange={(event) =>
            setQuery({ ...query, search: event.target.value, page: 1 })
          }
        />
      </label>
      <AsyncState
        loading={projects.isPending}
        error={projects.error}
        retry={() => void projects.refetch()}
      />
      <ul className="my-4 grid gap-2">
        {projects.data?.data
          .filter((project) => project.id !== note.projectId)
          .map((project) => (
            <li key={project.id}>
              <button
                className="w-full rounded border border-slate-300 p-3 text-left hover:bg-slate-50"
                disabled={move.isPending}
                onClick={() => move.mutate(project.id, { onSuccess: onClose })}
              >
                {project.title}
              </button>
            </li>
          ))}
      </ul>
      {projects.data && (
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={projects.data.total}
          onChange={(page) => setQuery({ ...query, page })}
        />
      )}
      {move.error && (
        <p role="alert" className="text-red-700">
          {move.error.message}
        </p>
      )}
    </Modal>
  );
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const [query, setQuery] = useState(initialQuery);
  const notes = useNotes(projectId, query);
  const navigate = useNavigate();
  const create = useNoteMutation(() => notesApi.create(projectId));
  const pin = useNoteMutation(notesApi.pin);
  const archive = useNoteMutation(notesApi.archive);
  const duplicate = useNoteMutation(notesApi.duplicate);
  const remove = useNoteMutation(notesApi.remove);
  const [deleting, setDeleting] = useState<NoteItem | null>(null);
  const [moving, setMoving] = useState<NoteItem | null>(null);
  const data = project.data?.data;
  const busy =
    pin.isPending || archive.isPending || duplicate.isPending || remove.isPending;
  const error = create.error || pin.error || archive.error || duplicate.error;
  return (
    <section>
      <Link className="text-sm text-teal-800 underline" to="/">
        All projects
      </Link>
      <AsyncState
        loading={project.isPending}
        error={project.error}
        retry={() => void project.refetch()}
      />
      {data && (
        <>
          {!data.archivedAt && <StudySources projectId={projectId} />}
          <nav aria-label="Project study materials" className="my-4 flex gap-4">
            <Link
              className="text-teal-800 underline"
              to={'/projects/' + projectId + '/history'}
            >
              Study history
            </Link>
            <Link
              className="text-teal-800 underline"
              to={'/projects/' + projectId + '/analytics'}
            >
              Analytics
            </Link>
            <Link
              className="text-teal-800 underline"
              to={'/projects/' + projectId + '/summaries'}
            >
              Saved summaries
            </Link>
            <Link
              className="text-teal-800 underline"
              to={'/projects/' + projectId + '/quizzes'}
            >
              Saved quizzes
            </Link>
          </nav>
          <div className="my-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{data.title}</h1>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                {data.description}
              </p>
            </div>
            <button
              className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
              disabled={Boolean(data.archivedAt) || create.isPending}
              onClick={() =>
                create.mutate(undefined, {
                  onSuccess: (response) =>
                    void navigate(`/projects/${projectId}/notes/${response.data.id}`),
                })
              }
            >
              New note
            </button>
          </div>
          {data.archivedAt && (
            <p role="status" className="mb-4 rounded border border-amber-200 p-3">
              This project is archived. Restore it from My projects to edit notes.
            </p>
          )}
          <div className="my-4 flex flex-wrap gap-3">
            <label className="min-w-48 flex-1">
              <span className="sr-only">Search notes</span>
              <input
                className="w-full rounded border border-slate-300 bg-white p-3"
                type="search"
                placeholder="Search notes"
                value={query.search}
                onChange={(event) =>
                  setQuery({ ...query, search: event.target.value, page: 1 })
                }
              />
            </label>
            <label>
              <span className="sr-only">Sort notes</span>
              <select
                className="rounded border border-slate-300 p-3"
                value={query.sort}
                onChange={(event) =>
                  setQuery({
                    ...query,
                    sort: event.target.value as ListQuery['sort'],
                    page: 1,
                  })
                }
              >
                <option value="updatedAt">Last edited</option>
                <option value="createdAt">Date created</option>
                <option value="title">Title</option>
              </select>
            </label>
            <button
              className="rounded border border-slate-300 px-3"
              onClick={() =>
                setQuery({
                  ...query,
                  order: query.order === 'asc' ? 'desc' : 'asc',
                  page: 1,
                })
              }
            >
              {query.order === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
          <div role="group" aria-label="Note state" className="my-4 flex gap-3">
            <button
              className="rounded border border-slate-300 px-3 py-2 aria-pressed:bg-teal-100"
              aria-pressed={!query.archived}
              onClick={() => setQuery({ ...query, archived: false, page: 1 })}
            >
              Active
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-2 aria-pressed:bg-teal-100"
              aria-pressed={query.archived}
              onClick={() => setQuery({ ...query, archived: true, page: 1 })}
            >
              Archived
            </button>
          </div>
          <AsyncState
            loading={notes.isPending}
            error={notes.error}
            retry={() => void notes.refetch()}
            empty={notes.data?.total === 0 ? 'No notes found.' : undefined}
          />
          {error && (
            <p role="alert" className="text-red-700">
              {error.message}
            </p>
          )}
          <div className="grid gap-3">
            {notes.data?.data.map((note) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-5"
                key={note.id}
              >
                <h2 className="text-lg font-semibold">
                  <Link
                    className="hover:underline"
                    to={`/projects/${projectId}/notes/${note.id}`}
                  >
                    {note.title}
                  </Link>
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  Created {new Date(note.createdAt).toLocaleDateString()} · Edited{' '}
                  {new Date(note.updatedAt).toLocaleString()}
                  {note.pinned ? ' · Pinned' : ''}
                </p>
                {!data.archivedAt && (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    {!note.archivedAt && (
                      <button
                        className="underline"
                        disabled={busy}
                        onClick={() => pin.mutate(note)}
                      >
                        {note.pinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => duplicate.mutate(note)}
                    >
                      Duplicate
                    </button>
                    {!note.archivedAt && (
                      <button
                        className="underline"
                        disabled={busy}
                        onClick={() => setMoving(note)}
                      >
                        Move
                      </button>
                    )}
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => archive.mutate(note)}
                    >
                      {note.archivedAt ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      className="text-red-700 underline"
                      disabled={busy}
                      onClick={() => {
                        remove.reset();
                        setDeleting(note);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {notes.data && (
            <Pagination
              page={query.page}
              pageSize={query.pageSize}
              total={notes.data.total}
              onChange={(page) => setQuery({ ...query, page })}
            />
          )}
        </>
      )}
      {moving && <MoveNoteDialog note={moving} onClose={() => setMoving(null)} />}
      {deleting && (
        <Modal
          title={`Delete ${deleting.title}?`}
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <p className="text-sm">
            Saved source references and historical quiz attempts will be retained.
          </p>
          {remove.error && (
            <p role="alert" className="mt-3 text-red-700">
              {remove.error.message}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              className="rounded border border-slate-300 px-4 py-2"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="rounded bg-red-700 px-4 py-2 text-white"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(deleting, { onSuccess: () => setDeleting(null) })
              }
            >
              Confirm deletion
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default function ProjectDetail() {
  const { projectId = '' } = useParams();
  return <ProjectWorkspace key={projectId} projectId={projectId} />;
}
