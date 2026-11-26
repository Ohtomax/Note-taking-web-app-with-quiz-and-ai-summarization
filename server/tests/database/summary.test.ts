import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDatabaseFixture } from './setup.ts';

test('summary preserves two source revisions when a note changes or is removed', async () => {
  await withDatabaseFixture(async (db) => {
    const owner = await db.user.create({ data: { firebaseUid: randomUUID() } });
    const project = await db.project.create({
      data: { title: 'Study', ownerId: owner.id },
    });
    const first = await db.note.create({
      data: { title: 'First', projectId: project.id },
    });
    const second = await db.note.create({
      data: { title: 'Second', projectId: project.id },
    });
    const summary = await db.summary.create({
      data: {
        title: 'Guide',
        projectId: project.id,
        sources: {
          create: [first, second].map((note) => ({
            noteId: note.id,
            sourceKey: note.id,
            noteTitle: note.title,
            revision: note.revision,
            contentHash: 'a'.repeat(64),
          })),
        },
      },
    });
    await db.note.update({
      where: { id: first.id },
      data: { revision: { increment: 1 } },
    });
    await db.note.delete({ where: { id: second.id } });
    const sources = await db.summarySource.findMany({ where: { summaryId: summary.id } });
    assert.equal(sources.length, 2);
    assert.equal(sources.find((source) => source.sourceKey === first.id)?.revision, 1);
    assert.equal(sources.find((source) => source.sourceKey === second.id)?.noteId, null);
    assert.equal(
      sources.find((source) => source.sourceKey === second.id)?.noteTitle,
      'Second',
    );
  });
});
