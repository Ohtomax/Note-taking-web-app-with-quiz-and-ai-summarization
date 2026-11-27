import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNote } from './useNotes';
import { useProject } from '@/features/projects/useProjects';
import { RichTextEditor } from './editor/RichTextEditor';
import { notesApi } from '@/api/notes';
import { AsyncState } from '@/components/ui/AsyncState';
import type { Note } from '@/types/workspace';
import { useSession } from '@/store/session';

function NoteForm({ note, readOnly }: { note: Note; readOnly: boolean }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [revision, setRevision] = useState(note.revision);
  const cache = useQueryClient();
  const uid = useSession((state) => state.user!.uid);
  const save = useMutation({
    mutationFn: () =>
      notesApi.save(note.projectId, note.id, {
        title,
        content,
        expectedRevision: revision,
      }),
    onSuccess: async (response) => {
      setRevision(response.data.revision);
      cache.setQueryData([uid, 'note', note.projectId, note.id], response);
      await Promise.all(
        ['notes', 'projects', 'project'].map((domain) =>
          cache.invalidateQueries({ queryKey: [uid, domain] }),
        ),
      );
    },
  });
  const disabled = readOnly || save.isPending;
  return (
    <section>
      <Link
        className="text-sm text-teal-800 underline"
        to={`/projects/${note.projectId}`}
      >
        Back to project
      </Link>
      <label className="my-5 grid gap-2 text-sm">
        Note title
        <input
          className="rounded-lg border border-slate-300 p-3 text-xl font-semibold"
          value={title}
          required
          maxLength={200}
          disabled={disabled}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <RichTextEditor content={content} disabled={disabled} onChange={setContent} />
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={disabled || !title.trim()}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save note'}
        </button>
        {save.isSuccess && (
          <p role="status" className="text-sm text-teal-800">
            Saved
          </p>
        )}
        {readOnly && (
          <p role="status" className="text-sm">
            Restore the archived note and project to edit.
          </p>
        )}
      </div>
      {save.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {save.error.message}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Created {new Date(note.createdAt).toLocaleString()} · Edited{' '}
        {new Date(note.updatedAt).toLocaleString()}
      </p>
    </section>
  );
}

export default function NotePage() {
  const { projectId = '', noteId = '' } = useParams();
  const note = useNote(projectId, noteId);
  const project = useProject(projectId);
  return (
    <>
      <AsyncState
        loading={note.isPending || project.isPending}
        error={note.error || project.error}
        retry={() => {
          void note.refetch();
          void project.refetch();
        }}
      />
      {note.data && project.data && (
        <NoteForm
          key={noteId}
          note={note.data.data}
          readOnly={Boolean(note.data.data.archivedAt || project.data.data.archivedAt)}
        />
      )}
    </>
  );
}
