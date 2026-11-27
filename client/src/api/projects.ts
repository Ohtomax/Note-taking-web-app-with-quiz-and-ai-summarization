import { apiRequest, queryString } from './client';
import {
  projectResponseSchema,
  projectPageSchema,
  deletionPreviewSchema,
  type ProjectInput,
  type ListQuery,
  type DeletionPreview,
} from '@/types/workspace';

export const projectsApi = {
  list: async (query: ListQuery, signal?: AbortSignal) =>
    projectPageSchema.parse(
      await apiRequest<unknown>(
        '/projects?' + queryString({ ...query }),
        signal ? { signal } : {},
      ),
    ),
  find: async (id: string, signal?: AbortSignal) =>
    projectResponseSchema.parse(
      await apiRequest<unknown>('/projects/' + id, signal ? { signal } : {}),
    ),
  create: async (input: ProjectInput) =>
    projectResponseSchema.parse(
      await apiRequest<unknown>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    ),
  update: async (id: string, input: ProjectInput, expectedRevision: number) =>
    projectResponseSchema.parse(
      await apiRequest<unknown>('/projects/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ ...input, expectedRevision }),
      }),
    ),
  archive: async (id: string, archived: boolean, expectedRevision: number) =>
    projectResponseSchema.parse(
      await apiRequest<unknown>(`/projects/${id}/${archived ? 'archive' : 'restore'}`, {
        method: 'POST',
        body: JSON.stringify({ expectedRevision }),
      }),
    ),
  preview: async (id: string) =>
    deletionPreviewSchema.parse(
      await apiRequest<unknown>(`/projects/${id}/deletion-preview`),
    ),
  remove: (preview: DeletionPreview) =>
    apiRequest<void>('/projects/' + preview.projectId, {
      method: 'DELETE',
      body: JSON.stringify({ confirmed: true, impactRevision: preview.impactRevision }),
    }),
};
