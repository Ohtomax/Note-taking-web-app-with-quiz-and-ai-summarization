import { apiRequest } from './client';
import {
  generationResponseSchema,
  summaryResponseSchema,
  type SummaryContent,
} from '@/types/study';
import type { SourceRequest } from '@/types/study-sources';
export interface GenerateInput {
  operation: 'SUMMARY' | 'QUIZ';
  source: SourceRequest;
  settings: Record<string, unknown>;
}
export const studyApi = {
  generate: async (projectId: string, key: string, input: GenerateInput) =>
    generationResponseSchema.parse(
      await apiRequest<unknown>('/projects/' + projectId + '/generations', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(input),
      }),
    ),
  status: async (id: string, signal?: AbortSignal) =>
    generationResponseSchema.parse(
      await apiRequest<unknown>('/generations/' + id, signal ? { signal } : {}),
    ),
  saveSummary: async (projectId: string, generationId: string, content: SummaryContent) =>
    summaryResponseSchema.parse(
      await apiRequest<unknown>('/projects/' + projectId + '/summaries', {
        method: 'POST',
        body: JSON.stringify({ generationId, content }),
      }),
    ),
};
