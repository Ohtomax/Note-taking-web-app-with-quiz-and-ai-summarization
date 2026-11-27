import type { PrismaClient, Prisma } from '@/generated/prisma/client.js';
import type { CreateNoteInput } from '@/utils/input-validators/notes.js';
import { lockProject, checkRevision } from '@/repositories/workspace.repository.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { UpdateNoteInput } from '@/utils/input-validators/notes.js';
import { extractPlainText } from '@/utils/input-validators/note-content.js';

export const createNotesRepository = (db: PrismaClient) => ({
  update: (ownerId: string, projectId: string, noteId: string, input: UpdateNoteInput) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const note = await tx.note.findFirst({
        where: { id: noteId, projectId, deletedAt: null },
      });
      if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      if (note.archivedAt)
        throw new ServiceError('NOTE_ARCHIVED', 'Restore the note before editing', 409);
      checkRevision(note.revision, input.expectedRevision);
      const updated = await tx.note.update({
        where: { id: noteId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content !== undefined
            ? {
                content: input.content as unknown as Prisma.InputJsonValue,
                plainText: extractPlainText(input.content),
              }
            : {}),
          revision: { increment: 1 },
        },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return updated;
    }),
  create: (ownerId: string, projectId: string, input: CreateNoteInput) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const note = await tx.note.create({
        data: {
          projectId,
          title: input.title,
          content: input.content as unknown as Prisma.InputJsonValue,
          plainText: extractPlainText(input.content),
        },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return note;
    }),
  find: (ownerId: string, projectId: string, noteId: string) =>
    db.note.findFirst({
      where: {
        id: noteId,
        projectId,
        deletedAt: null,
        project: { ownerId, deletedAt: null },
      },
    }),
});

export type NotesRepository = ReturnType<typeof createNotesRepository>;
