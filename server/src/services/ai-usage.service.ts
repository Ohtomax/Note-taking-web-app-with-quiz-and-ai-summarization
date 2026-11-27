import type { AIUsageRepository, Pricing } from '@/repositories/ai-usage.repository.js';
import type { CallEvent } from '@/ai/call-policy.js';
export const createAIUsageService = (
  repository: AIUsageRepository,
  pricing?: Pricing,
) => ({
  list: (userId: string, page: number, pageSize: number) =>
    repository.list(userId, page, pageSize),
  observe: (userId: string, id: string) => (event: CallEvent) =>
    repository.recordCall(userId, id, event, pricing),
});
export type AIUsageService = ReturnType<typeof createAIUsageService>;
