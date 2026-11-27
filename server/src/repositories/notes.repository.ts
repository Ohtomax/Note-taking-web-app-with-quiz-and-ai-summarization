import type { PrismaClient, Prisma } from '@/generated/prisma/client.js';
import type { CreateNoteInput } from '@/utils/input-validators/notes.js';
import { lockProject, checkRevision } from '@/repositories/workspace.repository.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { UpdateNoteInput } from '@/utils/input-validators/notes.js';
import type { NoteListInput } from '@/utils/input-validators/notes.js';
import { extractPlainText } from '@/utils/input-validators/note-content.js';

async function findWritableNote(
  tx: Prisma.TransactionClient,
  projectId: string,
  noteId: string,
) {
  const note = await tx.note.findFirst({
    where: { id: noteId, projectId, deletedAt: null },
  });
  if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
  return note;
}

export const createNotesRepository = (db: PrismaClient) => ({
  remove: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
  ) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const note = await findWritableNote(tx, projectId, noteId);
      checkRevision(note.revision, expectedRevision);
      await tx.note.update({
        where: { id: noteId },
        data: { deletedAt: new Date(), revision: { increment: 1 } },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
    }),
  setArchived: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
    archived: boolean,
  ) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const note = await findWritableNote(tx, projectId, noteId);
      if (Boolean(note.archivedAt) === archived) return note;
      checkRevision(note.revision, expectedRevision);
      const updated = await tx.note.update({
        where: { id: noteId },
        data: { archivedAt: archived ? new Date() : null, revision: { increment: 1 } },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return updated;
    }),
  setPinned: (
    ownerId: string,
    projectId: string,
    noteId: string,
    expectedRevision: number,
    pinned: boolean,
  ) =>
    db.$transaction(async (tx) => {
      await lockProject(tx, ownerId, projectId);
      const note = await findWritableNote(tx, projectId, noteId);
      if (note.pinned === pinned) return note;
      if (note.archivedAt)
        throw new ServiceError('NOTE_ARCHIVED', 'Restore the note before editing', 409);
      checkRevision(note.revision, expectedRevision);
      const updated = await tx.note.update({
        where: { id: noteId },
        data: { pinned, revision: { increment: 1 } },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { revision: { increment: 1 } },
      });
      return updated;
    }),
  list: (ownerId: string, projectId: string, query: NoteListInput) =>
    db.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, ownerId, deletedAt: null },
        select: { id: true },
      });
      if (!project)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const where: Prisma.NoteWhereInput = {
        projectId,
        deletedAt: null,
        project: { ownerId, deletedAt: null },
        archivedAt: query.archived === 'true' ? { not: null } : null,
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { plainText: { contains: query.search, mode: 'insensitive' } },
        ],
      };
      const [data, total] = await Promise.all([
        tx.note.findMany({
          where,
          orderBy: [
            { pinned: 'desc' },
            { [query.sort]: query.order },
            { id: query.order },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            projectId: true,
            title: true,
            revision: true,
            pinned: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
            lastOpenedAt: true,
          },
        }),
        tx.note.count({ where }),
      ]);
      return { data, total, page: query.page, pageSize: query.pageSize };
    }),
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
