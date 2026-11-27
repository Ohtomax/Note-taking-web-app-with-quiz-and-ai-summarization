import type { PrismaClient } from '@/generated/prisma/client.js';
import { serializable } from './serializable.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const createDashboardRepository = (db: PrismaClient) => ({
  open: (ownerId: string, projectId: string, noteId: string) =>
    serializable(db, async (tx) => {
      const note = await tx.note.findFirst({
        where: {
          id: noteId,
          projectId,
          deletedAt: null,
          project: { ownerId, deletedAt: null },
        },
        select: { id: true, updatedAt: true },
      });
      if (!note) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      return tx.note.update({
        where: { id: note.id },
        data: { lastOpenedAt: new Date(), updatedAt: note.updatedAt },
        select: { id: true, lastOpenedAt: true },
      });
    }),
  recent: async (ownerId: string) => {
    const project = { ownerId, deletedAt: null };
    const [notes, projects, summaries, quizzes] = await Promise.all([
      db.note.findMany({
        where: { project, deletedAt: null, lastOpenedAt: { not: null } },
        select: { id: true, projectId: true, title: true, lastOpenedAt: true },
        orderBy: [{ lastOpenedAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
      db.project.findMany({
        where: project,
        select: { id: true, title: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
      db.summary.findMany({
        where: { project, deletedAt: null },
        select: { id: true, projectId: true, title: true, generatedAt: true },
        orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
      db.quiz.findMany({
        where: { project, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    ]);
    return {
      notes,
      projects,
      summaries,
      quizzes,
    };
  },
});
export type DashboardRepository = ReturnType<typeof createDashboardRepository>;
