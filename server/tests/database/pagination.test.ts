import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';

test('scoped stable pagination preserves tied timestamps with no duplicate rows', async () => {
  await withDatabaseFixture(async (db) => {
    const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
    const timestamp = new Date('2026-01-01T00:00:00Z');
    await db.project.createMany({
      data: Array.from({ length: 25 }, (_, index) => ({
        title: 'Project ' + index,
        ownerId: user.id,
        updatedAt: timestamp,
      })),
    });
    const seen: string[] = [];
    for (let page = 0; page < 5; page += 1) {
      const rows = await db.project.findMany({
        where: { ownerId: user.id, deletedAt: null },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: page * 5,
        take: 5,
        select: { id: true },
      });
      seen.push(...rows.map((row) => row.id));
    }
    assert.equal(seen.length, 25);
    assert.equal(new Set(seen).size, 25);
  });
});
