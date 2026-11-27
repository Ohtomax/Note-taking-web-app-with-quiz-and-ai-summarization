import { Link, useParams } from 'react-router-dom';
import { useNote } from './useNotes';
import { useProject } from '@/features/projects/useProjects';
import { RichTextEditor } from './editor/RichTextEditor';
import { useNoteSave } from './hooks/useNoteSave';
import { AsyncState } from '@/components/ui/AsyncState';
import { extractPlainText } from '@/types/note-content';
import type { Note } from '@/types/workspace';
import { StudySources } from './StudySources';
import { useNoteOpen } from './useNoteOpen';

function NoteForm({ note, readOnly }: { note: Note; readOnly: boolean }) {
  const save = useNoteSave(note, readOnly);
  const opened = useNoteOpen(note.projectId, note.id);
  return (
    <section>
      {opened.isError && (
        <p role="status">
          Recent note activity could not update.{' '}
          <button className="underline" onClick={() => opened.retry()}>
            Retry activity update
          </button>
        </p>
      )}
      <Link
        className="text-sm text-teal-800 dark:text-teal-300 underline"
        to={`/projects/${note.projectId}`}
      >
        Back to project
      </Link>
      <label className="my-5 grid gap-2 text-sm">
        Note title
        <input
          className="rounded-lg border border-slate-300 dark:border-slate-600 p-3 text-xl font-semibold"
          value={save.draft.title}
          required
          maxLength={200}
          disabled={readOnly}
          onChange={(event) => save.change({ ...save.draft, title: event.target.value })}
        />
      </label>
      <RichTextEditor
        content={save.draft.content}
        disabled={readOnly}
        onChange={(content) => save.change({ ...save.draft, content })}
      />
      <StudySources
        projectId={note.projectId}
        note={note}
        dirty={save.status !== 'saved'}
      />
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={
            readOnly ||
            save.status === 'saving' ||
            save.status === 'conflict' ||
            !save.draft.title.trim()
          }
          onClick={() => void (save.status === 'error' ? save.retry() : save.flush())}
        >
          {save.status === 'error' ? 'Retry save' : 'Save note'}
        </button>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {save.status === 'saving'
            ? 'Saving…'
            : save.status === 'saved'
              ? 'Saved'
              : save.status === 'conflict'
                ? 'A newer version needs review. Your draft is retained.'
                : save.status === 'error'
                  ? 'Save failed. Your draft is retained.'
                  : 'Unsaved changes'}
        </p>
        {readOnly && (
          <p className="text-sm">Restore the archived note and project to edit.</p>
        )}
      </div>
      {save.error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {save.error}
        </p>
      )}
      {save.status === 'conflict' && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-4">
          <button
            className="underline disabled:opacity-50"
            disabled={save.loadingLatest}
            onClick={() => void save.compareLatest()}
          >
            Compare latest version
          </button>
          {save.serverVersion && (
            <>
              <h2 className="mt-4 font-semibold">
                Server version — {save.serverVersion.title}
              </h2>
              <pre className="my-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                {extractPlainText(save.serverVersion.content)}
              </pre>
              <p className="text-sm">
                Your draft is still shown in the editor. Choosing the server version
                replaces this local draft.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <button className="underline" onClick={save.useServerVersion}>
                  Use server version
                </button>
                <button className="underline" onClick={save.reapplyDraft}>
                  Reapply my draft
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
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
          key={projectId + ':' + noteId}
          note={note.data.data}
          readOnly={Boolean(note.data.data.archivedAt || project.data.data.archivedAt)}
        />
      )}
    </>
  );
}
