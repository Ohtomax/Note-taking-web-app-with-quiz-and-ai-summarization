import type { NotesRepository } from '@/repositories/notes.repository.js';
import type { CreateNoteInput } from '@/utils/input-validators/notes.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const createNotesService = (repository: NotesRepository) => ({
  create: (ownerId: string, projectId: string, input: CreateNoteInput) =>
    repository.create(ownerId, projectId, input),
  find: async (ownerId: string, projectId: string, noteId: string) => {
    const note = await repository.find(ownerId, projectId, noteId);
    if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return note;
  },
});

export type NotesService = ReturnType<typeof createNotesService>;
