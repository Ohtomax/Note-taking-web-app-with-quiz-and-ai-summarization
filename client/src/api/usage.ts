import { z } from 'zod';
import { apiRequest } from './client';
const count = z.number().int().nonnegative();
export const usageSchema = z.object({
  quota: z.object({
    requestsUsed: count,
    requestLimit: count,
    accountedTokens: count,
    tokenLimit: count,
    active: count,
    concurrencyLimit: count,
    resetsAt: z.string().datetime(),
  }),
  data: z.array(
    z.object({
      id: z.string().uuid(),
      operation: z.string(),
      status: z.string(),
      createdAt: z.string().datetime(),
      inputTokens: count.nullable(),
      outputTokens: count.nullable(),
      estimatedCost: z
        .union([z.string().regex(/^\d+(\.\d+)?$/), z.number().nonnegative()])
        .nullable(),
    }),
  ),
  total: count,
  page: count,
  pageSize: count,
});
export const usageApi = {
  read: async (signal?: AbortSignal) =>
    usageSchema.parse(
      await apiRequest<unknown>('/ai-usage?page=1&pageSize=5', signal ? { signal } : {}),
    ),
};
