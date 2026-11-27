import { apiRequest } from './client';
import { quizVersionResponseSchema, quizMetaResponseSchema } from '@/types/quiz-library';
import type { QuizSettings } from '@/types/quiz-settings';
import type { QuizDraft } from '@/types/quiz';
export const quizzesApi = {
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
