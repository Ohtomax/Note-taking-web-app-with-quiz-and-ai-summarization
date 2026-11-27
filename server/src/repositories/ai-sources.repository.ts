import type { PrismaClient } from '@/generated/prisma/client.js';
import { lockProject } from '@/repositories/workspace.repository.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const createAISourcesRepository = (db: PrismaClient) => ({
  collect: (ownerId: string, projectId: string, ids?: string[]) =>
    db.$transaction(async (tx) => {
      // Every note writer locks its parent, so all pages observe the same source set.
      const project = await lockProject(tx, ownerId, projectId);
      const notes: Array<{
        id: string;
        title: string;
        revision: number;
        plainText: string;
      }> = [];
      let cursor: string | undefined;
      for (;;) {
        const page = await tx.note.findMany({
          where: {
            projectId,
            deletedAt: null,
            archivedAt: null,
            id: { ...(ids ? { in: ids } : {}), ...(cursor ? { gt: cursor } : {}) },
          },
          select: { id: true, title: true, revision: true, plainText: true },
          orderBy: { id: 'asc' },
          take: 50,
        });
        notes.push(...page);
        if (notes.length > 200)
          throw new ServiceError('SOURCE_LIMIT', 'Select at most 200 notes.', 422);
        if (page.length < 50) break;
        cursor = page.at(-1)!.id;
      }
      return { projectRevision: project.revision, notes };
    }),
});
export type AISourcesRepository = ReturnType<typeof createAISourcesRepository>;
