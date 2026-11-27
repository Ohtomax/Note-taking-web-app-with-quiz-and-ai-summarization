import { apiRequest, queryString } from './client';
import {
  historyPageSchema,
  comparisonResponseSchema,
  type HistoryQuery,
} from '@/types/history';
export const historyApi = {
  list: async (query: HistoryQuery, signal?: AbortSignal) =>
    historyPageSchema.parse(
      await apiRequest<unknown>(
        '/attempts?' + queryString({ ...query, pageSize: 12 }),
        signal ? { signal } : {},
      ),
    ),
  comparison: async (id: string, signal?: AbortSignal) =>
    comparisonResponseSchema.parse(
      await apiRequest<unknown>(
        '/attempts/' + id + '/comparison',
        signal ? { signal } : {},
      ),
    ),
};
