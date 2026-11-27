import type { ProjectsRepository } from '@/repositories/projects.repository.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';

export const createProjectsService = (repository: ProjectsRepository) => ({
  create: (ownerId: string, input: CreateProjectInput) =>
    repository.create(ownerId, input),
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
