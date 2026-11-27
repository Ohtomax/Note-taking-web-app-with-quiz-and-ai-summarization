import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import {
  createAIAdmissionRepository,
  quotaPolicy,
} from '../../src/repositories/ai-admission.repository.ts';
import { createAIUsageRepository } from '../../src/repositories/ai-usage.repository.ts';
test('P4-T09 serializable quota admission rejects races and expires unused leases', async () => {
  await withWorkspace(async ({ db, alice, bob }) => {
    const reserve = createAIAdmissionRepository(db, {
      ...quotaPolicy,
      dailyUserTokens: 100,
      userConcurrency: 1,
    });
    const input = {
      userId: alice.id,
      requestKey: randomUUID(),
      inputHash: 'a'.repeat(64),
      operation: 'SUMMARY' as const,
      provider: 'mock',
      model: 'fixed',
      reservedTokens: 80,
      leaseExpiresAt: new Date(Date.now() + 60000),
    };
    try {
      const results = await Promise.allSettled([
        reserve.reserve(input),
        reserve.reserve({ ...input, requestKey: randomUUID() }),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      const row = await db.aIUsage.findFirstOrThrow({ where: { userId: alice.id } });
      await db.aIUsage.update({
        where: { id: row.id },
        data: { leaseExpiresAt: new Date(0) },
      });
      const next = await reserve.reserve({ ...input, requestKey: randomUUID() });
      assert.equal(
        (await db.aIUsage.findUniqueOrThrow({ where: { id: row.id } })).accountedTokens,
        0,
      );
      await createAIUsageRepository(db).finish(alice.id, next.id, 'FAILED');
      assert.equal(
        (await db.aIUsage.findUniqueOrThrow({ where: { id: next.id } })).accountedTokens,
        0,
      );
      const tiny = createAIAdmissionRepository(db, { ...quotaPolicy, dailyRequests: 0 });
      await assert.rejects(
        tiny.reserve({ ...input, userId: bob.id, requestKey: randomUUID() }),
        /allowance/,
      );
    } finally {
      await db.aIUsage.deleteMany({ where: { userId: { in: [alice.id, bob.id] } } });
    }
  });
});
