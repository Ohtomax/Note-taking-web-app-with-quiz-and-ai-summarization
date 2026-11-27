import type { PrismaClient, Prisma } from '@/generated/prisma/client.js';
import type { CreateNoteInput } from '@/utils/input-validators/notes.js';
import { lockProject } from '@/repositories/workspace.repository.js';
import { extractPlainText } from '@/utils/input-validators/note-content.js';

export const createNotesRepository = (db: PrismaClient) => ({
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
