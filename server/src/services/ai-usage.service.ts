import type { AIUsageRepository, Pricing } from '@/repositories/ai-usage.repository.js';
import type { CallEvent } from '@/ai/call-policy.js';
import { quotaPolicy } from '@/repositories/ai-admission.repository.js';
export const createAIUsageService = (
  repository: AIUsageRepository,
  pricing?: Pricing,
  policy = quotaPolicy,
) => ({
  list: async (userId: string, page: number, pageSize: number) => ({
    ...(await repository.list(userId, page, pageSize)),
    quota: await repository.quota(userId, policy),
  }),
  observe: (userId: string, id: string) => (event: CallEvent) =>
    repository.recordCall(userId, id, event, pricing),
});
export type AIUsageService = ReturnType<typeof createAIUsageService>;
