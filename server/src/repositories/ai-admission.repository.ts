import type { PrismaClient } from '@/generated/prisma/client.js';
import type { UsageStart } from './ai-usage.repository.js';
import { serializable } from './serializable.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const quotaPolicy = {
  dailyRequests: 20,
  dailyUserTokens: 10000000,
  dailyGlobalTokens: 100000000,
  userConcurrency: 1,
  globalConcurrency: 4,
};
export function quotaWindow(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
export const createAIAdmissionRepository = (db: PrismaClient, policy = quotaPolicy) => ({
  reserve: (input: UsageStart, now = new Date()) =>
    serializable(db, async (tx) => {
      await tx.aIUsage.updateMany({
        where: { status: 'RESERVED', leaseExpiresAt: { lte: now } },
        data: {
          status: 'FAILED',
          accountedTokens: 0,
          completedAt: now,
          leaseExpiresAt: null,
        },
      });
      await tx.aIUsage.updateMany({
        where: { status: 'RUNNING', leaseExpiresAt: { lte: now } },
        data: { status: 'UNCERTAIN', completedAt: now, leaseExpiresAt: null },
      });
      const active = {
        status: { in: ['RESERVED', 'RUNNING'] as Array<'RESERVED' | 'RUNNING'> },
      };
      const [userActive, globalActive, userDaily, globalDaily] = await Promise.all([
        tx.aIUsage.count({ where: { ...active, userId: input.userId } }),
        tx.aIUsage.count({ where: active }),
        tx.aIUsage.aggregate({
          where: { userId: input.userId, createdAt: { gte: quotaWindow(now) } },
          _count: true,
          _sum: { accountedTokens: true },
        }),
        tx.aIUsage.aggregate({
          where: { createdAt: { gte: quotaWindow(now) } },
          _sum: { accountedTokens: true },
        }),
      ]);
      if (
        userActive >= policy.userConcurrency ||
        globalActive >= policy.globalConcurrency
      )
        throw new ServiceError(
          'AI_CONCURRENCY',
          'Generation capacity is busy. Try again shortly.',
          429,
        );
      if (
        userDaily._count >= policy.dailyRequests ||
        (userDaily._sum.accountedTokens ?? 0) + input.reservedTokens >
          policy.dailyUserTokens ||
        (globalDaily._sum.accountedTokens ?? 0) + input.reservedTokens >
          policy.dailyGlobalTokens
      )
        throw new ServiceError(
          'AI_QUOTA',
          'Generation allowance exhausted for this UTC day.',
          429,
        );
      return tx.aIUsage.create({
        data: { ...input, accountedTokens: input.reservedTokens },
      });
    }),
});
export type AIAdmissionRepository = ReturnType<typeof createAIAdmissionRepository>;
