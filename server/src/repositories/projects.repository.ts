import type { PrismaClient } from '@/generated/prisma/client.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';

export const createProjectsRepository = (db: PrismaClient) => ({
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
