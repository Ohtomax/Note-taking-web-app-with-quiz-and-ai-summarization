import { useEffect, useMemo, useState } from 'react';
import { useNotes } from './useNotes';
import { initialQuery } from '@/features/projects/project-display';
import { Pagination } from '@/components/ui/Pagination';
import { AsyncState } from '@/components/ui/AsyncState';
import { extractPlainText } from '@/types/note-content';
import type { Note } from '@/types/workspace';
import type { SourceChoice, SourceRequest } from '@/types/study-sources';
export interface SourcePickerProps {
  projectId: string;
  note?: Note | undefined;
  dirty?: boolean | undefined;
  onChange: (value: SourceChoice | null) => void;
}
function Picker({ projectId, note, dirty = false, onChange }: SourcePickerProps) {
  const [scope, setScope] = useState<Exclude<SourceRequest['scope'], 'SUMMARY'>>(
    note ? 'NOTE' : 'PROJECT',
  );
  const [ids, setIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    revision: number;
  } | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const notes = useNotes(projectId, query, scope === 'NOTES');
  const plain = note ? extractPlainText(note.content) : '';
  const choice = useMemo<SourceChoice | null>(() => {
    if (scope === 'PROJECT')
      return {
        projectId,
        source: { scope },
        description: 'All active saved notes in this project',
      };
    if (scope === 'NOTES')
      return ids.length
        ? {
            projectId,
            source: { scope, noteIds: ids },
            description: ids.length + ' selected saved notes',
          }
        : null;
    if (!note || dirty || note.archivedAt) return null;
    if (scope === 'NOTE')
      return {
        projectId,
        source: { scope, noteId: note.id, revision: note.revision },
        description: note.title + ' — whole saved note',
      };
    if (
      !selection ||
      selection.revision !== note.revision ||
      selection.start >= selection.end
    )
      return null;
    return {
      projectId,
      source: {
        scope,
        noteId: note.id,
        revision: note.revision,
        start: selection.start,
        end: selection.end,
      },
      description: 'Selected passage from ' + note.title,
    };
  }, [projectId, scope, ids, note, dirty, selection]);
  useEffect(() => {
    onChange(choice);
  }, [choice, onChange]);
  return (
    <fieldset className="grid gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <legend className="px-2 font-semibold">Study sources</legend>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Generation sends your selected saved material to Google Gemini. Archived and
        deleted notes are excluded. Unsaved edits are never sent.
      </p>
      <label className="grid gap-1 text-sm">
        Source scope
        <select
          className="rounded border border-slate-300 dark:border-slate-600 p-2"
          value={scope}
          onChange={(event) =>
            setScope(event.target.value as Exclude<SourceRequest['scope'], 'SUMMARY'>)
          }
        >
          {note && (
            <>
              <option value="NOTE">This whole note</option>
              <option value="EXCERPT">A passage from this note</option>
            </>
          )}
          <option value="NOTES">Selected notes in this project</option>
          <option value="PROJECT">All active project notes</option>
        </select>
      </label>
      {['NOTE', 'EXCERPT'].includes(scope) && dirty && (
        <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">
          Save this note before choosing its text for generation.
        </p>
      )}
      {scope === 'EXCERPT' && note && (
        <>
          <label className="grid gap-1 text-sm">
            Select a passage in the saved text
            <textarea
              readOnly
              className="min-h-32 rounded border border-slate-300 dark:border-slate-600 p-3"
              value={plain}
              onSelect={(event) => {
                const target = event.currentTarget;
                setSelection({
                  start: [...plain.slice(0, target.selectionStart)].length,
                  end: [...plain.slice(0, target.selectionEnd)].length,
                  revision: note.revision,
                });
              }}
            />
          </label>
          {(!selection ||
            selection.revision !== note.revision ||
            selection.start === selection.end) && (
            <p role="status" className="text-sm">
              Select a nonempty passage from the current saved revision.
            </p>
          )}
          {choice?.source.scope === 'EXCERPT' && (
            <blockquote className="whitespace-pre-wrap rounded bg-slate-50 dark:bg-slate-950 p-3 text-sm">
              {[...plain].slice(choice.source.start, choice.source.end).join('')}
            </blockquote>
          )}
        </>
      )}
      {scope === 'NOTES' && (
        <>
          <label className="grid gap-1 text-sm">
            Search source notes
            <input
              className="rounded border border-slate-300 dark:border-slate-600 p-2"
              type="search"
              value={query.search}
              onChange={(event) =>
                setQuery({ ...query, search: event.target.value, page: 1 })
              }
            />
          </label>
          <AsyncState
            loading={notes.isPending}
            error={notes.error}
            retry={() => void notes.refetch()}
            empty={notes.data?.total === 0 ? 'No active notes found.' : undefined}
          />
          <ul className="grid gap-2">
            {notes.data?.data.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ids.includes(item.id)}
                    disabled={!ids.includes(item.id) && ids.length >= 200}
                    onChange={() =>
                      setIds((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id],
                      )
                    }
                  />
                  {item.title}
                </label>
              </li>
            ))}
          </ul>
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
      <p role="status" className="text-sm font-medium">
        {choice?.description ?? 'Choose current source material to continue.'}
      </p>
    </fieldset>
  );
}
export function SourcePicker(props: SourcePickerProps) {
  return (
    <Picker key={props.projectId + ':' + (props.note?.id ?? 'project')} {...props} />
  );
}
