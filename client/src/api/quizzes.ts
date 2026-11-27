import { apiRequest, queryString } from './client';
import {
  quizPageSchema,
  versionPageSchema,
  duplicateQuizResponseSchema,
  renameQuizResponseSchema,
} from '@/types/quiz-library';
import { quizVersionResponseSchema, quizMetaResponseSchema } from '@/types/quiz-library';
import type { QuizSettings } from '@/types/quiz-settings';
import type { QuizDraft } from '@/types/quiz';
export const quizzesApi = {
  list: async (projectId: string, page: number, search: string, signal?: AbortSignal) =>
    quizPageSchema.parse(
      await apiRequest<unknown>(
        '/projects/' +
          projectId +
          '/quizzes?' +
          queryString({ page, pageSize: 12, search }),
        signal ? { signal } : {},
      ),
    ),
  versions: async (quizId: string, page: number, signal?: AbortSignal) =>
    versionPageSchema.parse(
      await apiRequest<unknown>(
        '/quizzes/' + quizId + '/versions?' + queryString({ page, pageSize: 12 }),
        signal ? { signal } : {},
      ),
    ),
  rename: async (id: string, title: string) =>
    renameQuizResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    ),
  duplicate: async (id: string, expectedVersion: number) =>
    duplicateQuizResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + id + '/duplicate', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion }),
      }),
    ),
  remove: (id: string) =>
    apiRequest<void>('/quizzes/' + id, {
      method: 'DELETE',
      body: JSON.stringify({ confirmed: true }),
    }),
  acceptGeneration: async (
    quizId: string,
    expectedVersion: number,
    generationId: string,
    settings: QuizSettings,
    content: QuizDraft,
  ) =>
    quizVersionResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + quizId + '/versions', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion, generationId, settings, content }),
      }),
    ),
  find: async (id: string, signal?: AbortSignal) =>
    quizMetaResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + id, signal ? { signal } : {}),
    ),
  authoring: async (quizId: string, versionId: string, signal?: AbortSignal) =>
    quizVersionResponseSchema.parse(
      await apiRequest<unknown>(
        '/quizzes/' + quizId + '/versions/' + versionId + '/authoring',
        signal ? { signal } : {},
      ),
    ),
  saveGenerated: async (
    projectId: string,
    generationId: string,
    settings: QuizSettings,
    content: QuizDraft,
  ) =>
    quizVersionResponseSchema.parse(
      await apiRequest<unknown>('/projects/' + projectId + '/quizzes', {
        method: 'POST',
        body: JSON.stringify({ generationId, settings, content }),
      }),
    ),
  publish: async (
    quizId: string,
    expectedVersion: number,
    settings: QuizSettings,
    content: QuizDraft,
  ) =>
    quizVersionResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + quizId + '/versions', {
        method: 'POST',
        body: JSON.stringify({ expectedVersion, settings, content }),
      }),
    ),
};
