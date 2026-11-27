import type { PrismaClient } from '@/generated/prisma/client.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';

export const createProjectsRepository = (db: PrismaClient) => ({
  create: (ownerId: string, input: CreateProjectInput) =>
    db.project.create({ data: { ...input, ownerId } }),
});

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
