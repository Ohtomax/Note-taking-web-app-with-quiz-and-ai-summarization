import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';

test('usage identity is scoped to each user and aggregates recorded tokens', async () => {
  await withDatabaseFixture(async (db) => {
    const first = await db.user.create({ data: { firebaseUid: randomUUID() } });
    const second = await db.user.create({ data: { firebaseUid: randomUUID() } });
    for (const user of [first, second]) {
      await db.aIUsage.create({
        data: {
          userId: user.id,
          requestKey: 'same-key',
          inputHash: 'a'.repeat(64),
          operation: 'SUMMARY',
          provider: 'mock',
          model: 'mock',
          inputTokens: 100,
          outputTokens: 20,
        },
      });
    }
    const total = await db.aIUsage.aggregate({
      where: { userId: first.id },
      _sum: { inputTokens: true, outputTokens: true },
    });
    assert.equal(total._sum.inputTokens, 100);
    assert.equal(total._sum.outputTokens, 20);
  });
});

test('usage duplicate keys for one user fail atomically', async () => {
  await assert.rejects(
    withDatabaseFixture(async (db) => {
      const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
      const data = {
        userId: user.id,
        requestKey: 'key',
        inputHash: 'a'.repeat(64),
        operation: 'SUMMARY' as const,
        provider: 'mock',
        model: 'mock',
      };
      await db.aIUsage.create({ data });
      await db.aIUsage.create({ data });
    }),
    { code: 'P2002' },
  );
});
