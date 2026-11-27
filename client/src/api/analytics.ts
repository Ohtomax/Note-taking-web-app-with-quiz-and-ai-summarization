import { apiRequest, queryString } from './client';
import { analyticsSchema, type AnalyticsScope } from '@/types/analytics';
export const analyticsApi = {
  read: async (
    scope: AnalyticsScope,
    query: {
      from?: string | undefined;
      to?: string | undefined;
      versionPage?: number | undefined;
    },
    signal?: AbortSignal,
  ) => {
    const path = scope.quizId
      ? '/quizzes/' + scope.quizId + '/analytics'
      : scope.projectId
        ? '/projects/' + scope.projectId + '/analytics'
        : '/analytics';
    const response = await apiRequest<{ data: unknown }>(
      path + '?' + queryString(query),
      signal ? { signal } : {},
    );
    return analyticsSchema.parse(response.data);
  },
};
