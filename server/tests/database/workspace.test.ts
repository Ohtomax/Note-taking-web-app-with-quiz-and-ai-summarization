import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';

test('workspace ownership, revisions and unique UID persist through Prisma', async () => {
  await withDatabaseFixture(async (db) => {
    const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
    const project = await db.project.create({
      data: { title: 'Networking', ownerId: user.id },
    });
    const note = await db.note.create({ data: { title: 'OSI', projectId: project.id } });
    assert.equal(note.revision, 1);
    assert.equal(
      (
        await db.note.findUniqueOrThrow({
          where: { id: note.id },
          include: { project: true },
        })
      ).project.ownerId,
      user.id,
    );
  });
});

test('database rejects duplicate Firebase UID and orphan project foreign keys', async () => {
  await assert.rejects(
    withDatabaseFixture(async (db) => {
      const uid = randomUUID();
      await db.user.create({ data: { firebaseUid: uid } });
      await db.user.create({ data: { firebaseUid: uid } });
    }),
    { code: 'P2002' },
  );
  await assert.rejects(
    withDatabaseFixture(async (db) => {
      await db.project.create({ data: { title: 'Orphan', ownerId: randomUUID() } });
    }),
    { code: 'P2003' },
  );
});
