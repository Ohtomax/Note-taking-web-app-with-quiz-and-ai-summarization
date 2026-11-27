import type { NotesRepository } from '@/repositories/notes.repository.js';
import type { CreateNoteInput } from '@/utils/input-validators/notes.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { UpdateNoteInput } from '@/utils/input-validators/notes.js';
import type { NoteListInput } from '@/utils/input-validators/notes.js';

export const createNotesService = (repository: NotesRepository) => ({
  remove: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
  ) => repository.remove(ownerId, projectId, noteId, expectedRevision),
  setArchived: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
    archived: boolean,
  ) => repository.setArchived(ownerId, projectId, noteId, expectedRevision, archived),
  setPinned: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
    pinned: boolean,
  ) => repository.setPinned(ownerId, projectId, noteId, expectedRevision, pinned),
  list: (ownerId: string, projectId: string, query: NoteListInput) =>
    repository.list(ownerId, projectId, query),
  update: (ownerId: string, projectId: string, noteId: string, input: UpdateNoteInput) =>
    repository.update(ownerId, projectId, noteId, input),
  create: (ownerId: string, projectId: string, input: CreateNoteInput) =>
    repository.create(ownerId, projectId, input),
  find: async (ownerId: string, projectId: string, noteId: string) => {
    const note = await repository.find(ownerId, projectId, noteId);
    if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return note;
  },
});

export type NotesService = ReturnType<typeof createNotesService>;
