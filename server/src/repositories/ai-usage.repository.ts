import type { PrismaClient, AIOperation } from '@/generated/prisma/client.js';
import type { CallEvent } from '@/ai/call-policy.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export interface Pricing {
  version: string;
  input: number;
  output: number;
}
export interface UsageStart {
  userId: string;
  requestKey: string;
  inputHash: string;
  operation: AIOperation;
  provider: string;
  model: string;
  reservedTokens: number;
  leaseExpiresAt: Date;
}
export const usageSelect = {
  id: true,
  operation: true,
  provider: true,
  model: true,
  status: true,
  inputTokens: true,
  outputTokens: true,
  estimatedCost: true,
  pricingVersion: true,
  reservedTokens: true,
  createdAt: true,
  completedAt: true,
  resultId: true,
} as const;
export const createAIUsageRepository = (db: PrismaClient) => ({
  start: (input: UsageStart) => db.aIUsage.create({ data: input }),
  recordCall: (userId: string, usageId: string, event: CallEvent, pricing?: Pricing) =>
    db.$transaction(async (tx) => {
      const usage = await tx.aIUsage.findFirst({ where: { id: usageId, userId } });
      if (!usage) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const completed = event.status !== 'RUNNING';
      await tx.aICall.upsert({
        where: { usageId_number: { usageId, number: event.number } },
        create: {
          usageId,
          number: event.number,
          status: event.status,
          ...event.usage,
          completedAt: completed ? new Date() : null,
        },
        update: {
          status: event.status,
          ...event.usage,
          completedAt: completed ? new Date() : null,
        },
      });
      const calls = await tx.aICall.findMany({
        where: { usageId },
        select: { inputTokens: true, outputTokens: true },
      });
      const known = calls.every(
        (call) => call.inputTokens !== null && call.outputTokens !== null,
      );
      const inputTokens = known
        ? calls.reduce((sum, call) => sum + call.inputTokens!, 0)
        : null;
      const outputTokens = known
        ? calls.reduce((sum, call) => sum + call.outputTokens!, 0)
        : null;
      await tx.aIUsage.update({
        where: { id: usageId },
        data: {
          status: 'RUNNING',
          inputTokens,
          outputTokens,
          estimatedCost:
            pricing && inputTokens !== null && outputTokens !== null
              ? (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000
              : null,
          pricingVersion: pricing?.version ?? null,
        },
      });
    }),
  finish: (
    userId: string,
    id: string,
    status: 'SUCCEEDED' | 'FAILED' | 'UNCERTAIN',
    resultId?: string,
  ) =>
    db.aIUsage.updateMany({
      where: { id, userId },
      data: {
        status,
        resultId: resultId ?? null,
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
    }),
  list: async (userId: string, page: number, pageSize: number) => {
    const where = { userId };
    const [data, total] = await db.$transaction([
      db.aIUsage.findMany({
        where,
        select: usageSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aIUsage.count({ where }),
    ]);
    return { data, total, page, pageSize };
  },
});
export type AIUsageRepository = ReturnType<typeof createAIUsageRepository>;
