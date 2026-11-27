import { apiRequest, queryString } from './client';
import {
  noteResponseSchema,
  notePageSchema,
  type NoteItem,
  type ListQuery,
} from '@/types/workspace';
import type { RichDocument } from '@/types/note';

export interface SaveNoteInput {
  title: string;
  content: RichDocument;
  expectedRevision: number;
}
export const notePath = (projectId: string, noteId?: string) =>
  `/projects/${projectId}/notes${noteId ? '/' + noteId : ''}`;

export const notesApi = {
  list: async (projectId: string, query: ListQuery, signal?: AbortSignal) =>
    notePageSchema.parse(
      await apiRequest<unknown>(
        notePath(projectId) + '?' + queryString({ ...query }),
        signal ? { signal } : {},
      ),
    ),
  find: async (projectId: string, noteId: string, signal?: AbortSignal) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(projectId, noteId), signal ? { signal } : {}),
    ),
  create: async (projectId: string) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(projectId), { method: 'POST', body: '{}' }),
    ),
  save: async (
    projectId: string,
    noteId: string,
    input: SaveNoteInput,
    signal?: AbortSignal,
  ) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(projectId, noteId), {
        method: 'PATCH',
        body: JSON.stringify(input),
        ...(signal ? { signal } : {}),
      }),
    ),
  pin: async (note: NoteItem) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(note.projectId, note.id) + '/pin', {
        method: 'POST',
        body: JSON.stringify({ expectedRevision: note.revision, pinned: !note.pinned }),
      }),
    ),
  archive: async (note: NoteItem) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(
        notePath(note.projectId, note.id) + (note.archivedAt ? '/restore' : '/archive'),
        { method: 'POST', body: JSON.stringify({ expectedRevision: note.revision }) },
      ),
    ),
  duplicate: async (note: NoteItem) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(note.projectId, note.id) + '/duplicate', {
        method: 'POST',
        body: JSON.stringify({ expectedRevision: note.revision }),
      }),
    ),
  move: async (note: NoteItem, destinationProjectId: string) =>
    noteResponseSchema.parse(
      await apiRequest<unknown>(notePath(note.projectId, note.id) + '/move', {
        method: 'POST',
        body: JSON.stringify({ expectedRevision: note.revision, destinationProjectId }),
      }),
    ),
  remove: (note: NoteItem) =>
    apiRequest<void>(notePath(note.projectId, note.id), {
      method: 'DELETE',
      body: JSON.stringify({ confirmed: true, expectedRevision: note.revision }),
    }),
};
