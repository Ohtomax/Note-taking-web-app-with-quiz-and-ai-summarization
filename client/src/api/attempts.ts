import { apiRequest } from './client';
import { attemptResponseSchema, type StartAttemptInput } from '@/types/attempts';
export const attemptsApi = {
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
