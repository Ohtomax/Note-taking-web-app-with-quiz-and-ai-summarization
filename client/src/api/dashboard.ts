import { z } from 'zod';
import { apiRequest } from './client';
import { analyticsSchema } from '@/types/analytics';
const base = z.object({ id: z.string().uuid(), title: z.string() });
export const dashboardSchema = z.object({
  recent: z.object({
    projects: z.array(base.extend({ createdAt: z.string().datetime() })),
    notes: z.array(
      base.extend({
        projectId: z.string().uuid(),
        lastOpenedAt: z.string().datetime().nullable(),
      }),
    ),
    summaries: z.array(
      base.extend({ projectId: z.string().uuid(), generatedAt: z.string().datetime() }),
    ),
    quizzes: z.array(
      base.extend({ projectId: z.string().uuid(), createdAt: z.string().datetime() }),
    ),
  }),
  performance: analyticsSchema,
});
export const dashboardApi = {
  read: async (signal?: AbortSignal) => {
    const response = await apiRequest<{ data: unknown }>(
      '/dashboard',
      signal ? { signal } : {},
    );
    return dashboardSchema.parse(response.data);
  },
  open: async (projectId: string, noteId: string) => {
    const response = await apiRequest<{ data: unknown }>(
      '/projects/' + projectId + '/notes/' + noteId + '/open',
      { method: 'POST', body: '{}' },
    );
    return z
      .object({ id: z.string().uuid(), lastOpenedAt: z.string().datetime() })
      .parse(response.data);
  },
};
