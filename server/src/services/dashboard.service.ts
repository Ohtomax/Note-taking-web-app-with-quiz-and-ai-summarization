import type { DashboardRepository } from '@/repositories/dashboard.repository.js';
import type { AnalyticsService } from './analytics.service.js';
export const createDashboardService = (
  repository: DashboardRepository,
  analytics: AnalyticsService,
) => ({
  read: async (ownerId: string) => {
    const [recent, performance] = await Promise.all([
      repository.recent(ownerId),
      analytics.global(ownerId, {}),
    ]);
    return { recent, performance };
  },
  open: (ownerId: string, projectId: string, noteId: string) =>
    repository.open(ownerId, projectId, noteId),
});
export type DashboardService = ReturnType<typeof createDashboardService>;
