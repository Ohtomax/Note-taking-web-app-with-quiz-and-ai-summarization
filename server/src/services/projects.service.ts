import type { ProjectsRepository } from '@/repositories/projects.repository.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';

export const createProjectsService = (repository: ProjectsRepository) => ({
  list: (ownerId: string, query: ProjectListInput) => repository.list(ownerId, query),
  create: (ownerId: string, input: CreateProjectInput) =>
    repository.create(ownerId, input),
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
