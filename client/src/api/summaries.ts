import { apiRequest, queryString } from './client';
import {
  summaryPageSchema,
  summaryResponseSchema,
  type SummaryContent,
} from '@/types/study';
export const summariesApi = {
  list: async (projectId: string, page: number, signal?: AbortSignal) =>
    summaryPageSchema.parse(
      await apiRequest<unknown>(
        '/projects/' + projectId + '/summaries?' + queryString({ page, pageSize: 12 }),
        signal ? { signal } : {},
      ),
    ),
  find: async (id: string, signal?: AbortSignal) =>
    summaryResponseSchema.parse(
      await apiRequest<unknown>('/summaries/' + id, signal ? { signal } : {}),
    ),
  update: async (id: string, input: { title?: string; content?: SummaryContent }) =>
    summaryResponseSchema.parse(
      await apiRequest<unknown>('/summaries/' + id, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    ),
  remove: (id: string) =>
    apiRequest<void>('/summaries/' + id, {
      method: 'DELETE',
      body: JSON.stringify({ confirmed: true }),
    }),
};
