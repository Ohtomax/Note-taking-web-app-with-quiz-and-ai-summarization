import type { ProjectsRepository } from '@/repositories/projects.repository.js';
import type { CreateProjectInput } from '@/utils/input-validators/projects.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { UpdateProjectInput } from '@/utils/input-validators/projects.js';

export const createProjectsService = (repository: ProjectsRepository) => ({
  setArchived: (
    ownerId: string,
    projectId: string,
    expectedRevision: number,
    archived: boolean,
  ) => repository.setArchived(ownerId, projectId, expectedRevision, archived),
  update: (ownerId: string, projectId: string, input: UpdateProjectInput) =>
    repository.update(ownerId, projectId, input),
  find: async (ownerId: string, projectId: string) => {
    const project = await repository.find(ownerId, projectId);
    if (!project) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    const { _count, ...metadata } = project;
    return { ...metadata, noteCount: _count.notes };
  },
  list: (ownerId: string, query: ProjectListInput) => repository.list(ownerId, query),
  create: (ownerId: string, input: CreateProjectInput) =>
    repository.create(ownerId, input),
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
