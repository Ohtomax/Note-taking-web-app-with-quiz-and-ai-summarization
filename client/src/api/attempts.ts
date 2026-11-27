import { apiRequest, queryString } from './client';
import { openAttemptPageSchema } from '@/types/attempts';
import { attemptResultResponseSchema } from '@/types/attempts';
import type { SaveAnswerInput } from '@/types/attempts';
import { attemptResponseSchema, type StartAttemptInput } from '@/types/attempts';
export const attemptsApi = {
  results: async (id: string, signal?: AbortSignal) =>
    attemptResultResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id + '/results', signal ? { signal } : {}),
    ),
  open: async (quizId: string | undefined, page: number, signal?: AbortSignal) =>
    openAttemptPageSchema.parse(
      await apiRequest<unknown>(
        '/attempts/in-progress?' +
          queryString({ page, pageSize: 12, ...(quizId ? { quizId } : {}) }),
        signal ? { signal } : {},
      ),
    ),
  locate: async (id: string, questionIndex: number) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id + '/location', {
        method: 'PATCH',
        body: JSON.stringify({ questionIndex }),
      }),
    ),
  abandon: async (id: string) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id + '/abandon', {
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      }),
    ),
  submit: async (id: string) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id + '/submit', {
        method: 'POST',
        body: '{}',
      }),
    ),
  saveAnswer: async (id: string, questionId: string, input: SaveAnswerInput) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id + '/answers/' + questionId, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    ),
  start: async (quizId: string, key: string, input: StartAttemptInput) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/quizzes/' + quizId + '/attempts', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(input),
      }),
    ),
  find: async (id: string, signal?: AbortSignal) =>
    attemptResponseSchema.parse(
      await apiRequest<unknown>('/attempts/' + id, signal ? { signal } : {}),
    ),
};
