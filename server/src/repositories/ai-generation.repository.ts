import { Prisma, type PrismaClient } from '@/generated/prisma/client.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const jsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const createAIGenerationRepository = (db: PrismaClient) => ({
  findKey: (userId: string, requestKey: string) =>
    db.aIUsage.findUnique({ where: { userId_requestKey: { userId, requestKey } } }),
  get: async (userId: string, id: string) => {
    const record = await db.aIUsage.findFirst({ where: { userId, id } });
    if (!record) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    if (
      record.leaseExpiresAt &&
      record.leaseExpiresAt <= new Date() &&
      ['RESERVED', 'RUNNING'].includes(record.status)
    ) {
      await db.aIUsage.updateMany({
        where: { id, userId, status: record.status },
        data: {
          status: record.status === 'RESERVED' ? 'FAILED' : 'UNCERTAIN',
          errorCode: 'AI_INTERRUPTED',
          completedAt: new Date(),
          leaseExpiresAt: null,
          ...(record.status === 'RESERVED' ? { accountedTokens: 0 } : {}),
        },
      });
      return db.aIUsage.findUniqueOrThrow({ where: { id } });
    }
    return record;
  },
  complete: (userId: string, id: string, result: unknown) =>
    db.$transaction(async (tx) => {
      const usage = await tx.aIUsage.findFirst({
        where: {
          id,
          userId,
          status: { in: ['RESERVED', 'RUNNING'] },
          leaseExpiresAt: { gt: new Date() },
        },
      });
      if (!usage)
        throw new ServiceError(
          'AI_INTERRUPTED',
          'Generation is no longer active. Retrieve its status.',
          409,
        );
      const accountedTokens =
        usage.inputTokens !== null && usage.outputTokens !== null
          ? usage.inputTokens + usage.outputTokens
          : usage.reservedTokens;
      return tx.aIUsage.update({
        where: { id },
        data: {
          result: jsonValue(result),
          status: 'SUCCEEDED',
          completedAt: new Date(),
          leaseExpiresAt: null,
          accountedTokens,
        },
      });
    }),
  fail: async (
    userId: string,
    id: string,
    status: 'FAILED' | 'UNCERTAIN',
    code: string,
  ) => {
    await db.$transaction(async (tx) => {
      const usage = await tx.aIUsage.findFirst({
        where: { id, userId, status: { in: ['RESERVED', 'RUNNING'] } },
      });
      if (!usage) return;
      const calls = await tx.aICall.count({ where: { usageId: id } });
      const accountedTokens = !calls
        ? 0
        : usage.inputTokens !== null && usage.outputTokens !== null
          ? usage.inputTokens + usage.outputTokens
          : usage.reservedTokens;
      await tx.aIUsage.update({
        where: { id },
        data: {
          status,
          errorCode: code,
          completedAt: new Date(),
          leaseExpiresAt: null,
          accountedTokens,
        },
      });
    });
  },
});
export type AIGenerationRepository = ReturnType<typeof createAIGenerationRepository>;
