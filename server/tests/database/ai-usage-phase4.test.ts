import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createAIUsageRepository } from '../../src/repositories/ai-usage.repository.ts';
test('P4-T08 per-call ledger attributes failures, estimates known usage and preserves unknown cost', async () => {
  await withWorkspace(async ({ db, alice, bob, api }) => {
    const ledger = createAIUsageRepository(db);
    const usage = await ledger.start({
      userId: alice.id,
      requestKey: randomUUID(),
      inputHash: 'a'.repeat(64),
      operation: 'SUMMARY',
      provider: 'mock',
      model: 'fixed',
      reservedTokens: 1000,
      leaseExpiresAt: new Date(Date.now() + 60000),
    });
    try {
      await ledger.recordCall(
        alice.id,
        usage.id,
        { number: 1, status: 'SUCCEEDED', usage: { inputTokens: 100, outputTokens: 50 } },
        { version: 'fixture', input: 1, output: 2 },
      );
      const known = (await ledger.list(alice.id, 1, 20)).data[0]!;
      assert.equal(Number(known.estimatedCost), 0.0002);
      assert.equal(known.pricingVersion, 'fixture');
      await ledger.recordCall(alice.id, usage.id, {
        number: 2,
        status: 'UNCERTAIN',
        usage: { inputTokens: null, outputTokens: null },
      });
      await ledger.finish(alice.id, usage.id, 'UNCERTAIN');
      const unknown = (await ledger.list(alice.id, 1, 20)).data[0]!;
      assert.equal(unknown.estimatedCost, null);
      assert.equal(unknown.inputTokens, null);
      assert.equal((await ledger.list(bob.id, 1, 20)).total, 0);
      const owned = await api
        .get('/api/v1/ai-usage')
        .set('Authorization', 'Bearer alice');
      assert.equal(owned.status, 200);
      assert.equal(owned.body.total, 1);
      assert.equal(
        (await api.get('/api/v1/ai-usage').set('Authorization', 'Bearer bob')).body.total,
        0,
      );
      await assert.rejects(
        ledger.recordCall(bob.id, usage.id, {
          number: 3,
          status: 'RUNNING',
          usage: { inputTokens: null, outputTokens: null },
        }),
        /Resource not found/,
      );
      assert.equal(await db.aICall.count({ where: { usageId: usage.id } }), 2);
    } finally {
      await db.aIUsage.delete({ where: { id: usage.id } });
    }
  });
});
