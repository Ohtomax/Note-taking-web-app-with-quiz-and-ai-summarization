import type { PrismaClient } from '@/generated/prisma/client.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';
import type { UpdateProjectInput } from '@/utils/input-validators/projects.js';
import { lockProject, checkRevision } from '@/repositories/workspace.repository.js';

export const createProjectsRepository = (db: PrismaClient) => ({
  deletionPreview: (ownerId: string, projectId: string) =>
    db.$transaction(async (tx) => {
      const project = await lockProject(tx, ownerId, projectId, false);
      const [notes, summaries, quizzes, attempts] = await Promise.all([
        tx.note.count({ where: { projectId, deletedAt: null } }),
        tx.summary.count({ where: { projectId, deletedAt: null } }),
        tx.quiz.count({ where: { projectId, deletedAt: null } }),
        tx.quizAttempt.count({ where: { version: { quiz: { projectId } } } }),
      ]);
      return {
        projectId,
        title: project.title,
        impactRevision: project.revision,
        notes,
        summaries,
        quizzes,
        retainedAttempts: attempts,
      };
    }),
  remove: (ownerId: string, projectId: string, impactRevision: number) =>
    db.$transaction(async (tx) => {
      const project = await lockProject(tx, ownerId, projectId, false);
      checkRevision(project.revision, impactRevision);
      await tx.project.update({
        where: { id: project.id },
        data: { deletedAt: new Date(), revision: { increment: 1 } },
      });
    }),
  setArchived: (
    ownerId: string,
    projectId: string,
    expectedRevision: number,
    archived: boolean,
  ) =>
    db.$transaction(async (tx) => {
      const project = await lockProject(tx, ownerId, projectId, false);
      if (Boolean(project.archivedAt) === archived) return project;
      checkRevision(project.revision, expectedRevision);
      return tx.project.update({
        where: { id: project.id },
        data: {
          archivedAt: archived ? new Date() : null,
          revision: { increment: 1 },
        },
      });
    }),
  update: (ownerId: string, projectId: string, input: UpdateProjectInput) =>
    db.$transaction(async (tx) => {
      const project = await lockProject(tx, ownerId, projectId);
      checkRevision(project.revision, input.expectedRevision);
      return tx.project.update({
        where: { id: project.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          revision: { increment: 1 },
        },
      });
    }),
  find: (ownerId: string, projectId: string) =>
    db.project.findFirst({
      where: { id: projectId, ownerId, deletedAt: null },
      include: {
        _count: { select: { notes: { where: { deletedAt: null, archivedAt: null } } } },
      },
    }),
  list: async (ownerId: string, query: ProjectListInput) => {
    const where = {
      ownerId,
      deletedAt: null,
      archivedAt: query.archived === 'true' ? { not: null } : null,
      title: { contains: query.search, mode: 'insensitive' as const },
    };
    const [data, total] = await db.$transaction([
      db.project.findMany({
        where,
        orderBy: [{ [query.sort]: query.order }, { id: query.order }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: { select: { notes: { where: { deletedAt: null, archivedAt: null } } } },
        },
      }),
      db.project.count({ where }),
    ]);
    return {
      data: data.map(({ _count, ...project }) => ({
        ...project,
        noteCount: _count.notes,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },
  create: (ownerId: string, input: CreateProjectInput) =>
    db.project.create({ data: { ...input, ownerId } }),
});

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
