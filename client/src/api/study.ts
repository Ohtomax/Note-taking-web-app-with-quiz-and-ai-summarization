import { requestSummary } from './summary-generation';
import { apiRequest, GENERATION_TIMEOUT_MS } from './client';
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
const requestQuiz = async (path: string, key: string, input: GenerateInput) =>
  generationResponseSchema.parse(
    await apiRequest<unknown>(path, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(input),
      timeoutMs: GENERATION_TIMEOUT_MS,
    }),
  );
export const studyApi = {
  regenerateSummary: (
    summaryId: string,
    key: string,
    input: GenerateInput,
    onSummary?: (content: SummaryContent) => void,
  ) => requestSummary('/summaries/' + summaryId + '/regenerate', key, input, onSummary),
  regenerateQuiz: (quizId: string, key: string, input: GenerateInput) =>
    requestQuiz('/quizzes/' + quizId + '/regenerate', key, input),
  generate: (
    projectId: string,
    key: string,
    input: GenerateInput,
    onSummary?: (content: SummaryContent) => void,
  ) =>
    input.operation === 'SUMMARY'
      ? requestSummary('/projects/' + projectId + '/generations', key, input, onSummary)
      : requestQuiz('/projects/' + projectId + '/generations', key, input),
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
