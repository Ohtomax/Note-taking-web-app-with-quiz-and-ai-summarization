import type { PrismaClient } from '@/generated/prisma/client.js';
import { lockProject } from '@/repositories/workspace.repository.js';
export const createAISourcesRepository = (db: PrismaClient) => ({
  collect: (ownerId: string, projectId: string, ids: string[]) =>
    db.$transaction(async (tx) => {
      const project = await lockProject(tx, ownerId, projectId);
      const notes = await tx.note.findMany({
        where: { projectId, id: { in: ids }, deletedAt: null, archivedAt: null },
        select: { id: true, title: true, revision: true, plainText: true },
        orderBy: { id: 'asc' },
      });
      return { projectRevision: project.revision, notes };
    }),
});
export type AISourcesRepository = ReturnType<typeof createAISourcesRepository>;
