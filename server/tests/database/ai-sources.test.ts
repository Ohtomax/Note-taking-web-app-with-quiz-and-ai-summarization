import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorkspace } from './workspace.fixture.ts';
import { createAISourcesRepository } from '../../src/repositories/ai-sources.repository.ts';
import { createAISourcesService } from '../../src/services/ai-sources.service.ts';
test('P4-T02 resolves Unicode code point excerpts and rejects stale, invalid and foreign sources', async () => {
  await withWorkspace(async ({ db, alice, bob, project }) => {
    const note = await db.note.create({
      data: { projectId: project.id, title: 'Unicode', plainText: 'TCP 😀 café' },
    });
    const resolver = createAISourcesService(createAISourcesRepository(db));
    const source = {
      scope: 'EXCERPT' as const,
      noteId: note.id,
      revision: 1,
      start: 4,
      end: 5,
    };
    assert.equal(
      (await resolver.resolve(alice.id, project.id, source)).sources[0]!.text,
      '😀',
    );
    for (const input of [
      { ...source, revision: 2 },
      { ...source, start: 5, end: 5 },
      { ...source, end: 100 },
    ])
      await assert.rejects(resolver.resolve(alice.id, project.id, input));
    await assert.rejects(
      resolver.resolve(bob.id, project.id, source),
      /Resource not found/,
    );
    await db.note.update({
      where: { id: note.id },
      data: { revision: 2, plainText: 'Changed' },
    });
    await assert.rejects(
      resolver.resolve(alice.id, project.id, source),
      /current source revision/,
    );
  });
});

test('P4-T03 folder manifests page stably, exclude archived/empty notes and reject mixed ownership atomically', async () => {
  await withWorkspace(async ({ db, alice, project, foreign }) => {
    await db.note.createMany({
      data: Array.from({ length: 125 }, (_, i) => ({
        projectId: project.id,
        title: 'Page ' + i,
        plainText: 'Concept ' + i,
      })),
    });
    await db.note.createMany({
      data: [
        {
          projectId: project.id,
          title: 'Archived',
          plainText: 'Excluded',
          archivedAt: new Date(),
        },
        { projectId: project.id, title: 'Blank', plainText: '  ' },
      ],
    });
    const outside = await db.note.create({
      data: { projectId: foreign.id, title: 'Other', plainText: 'Private' },
    });
    const resolver = createAISourcesService(createAISourcesRepository(db));
    const manifest = await resolver.resolve(alice.id, project.id, { scope: 'PROJECT' });
    assert.equal(manifest.sources.length, 125);
    assert.equal(new Set(manifest.sources.map((s) => s.sourceKey)).size, 125);
    assert.deepEqual(
      manifest.sources.map((s) => s.noteId),
      manifest.sources.map((s) => s.noteId).sort(),
    );
    const firstNoteId = manifest.sources[0]?.noteId;
    assert.ok(firstNoteId);
    await assert.rejects(
      resolver.resolve(alice.id, project.id, {
        scope: 'NOTES',
        noteIds: [firstNoteId, outside.id],
      }),
      /Resource not found/,
    );
    const empty = await db.project.create({
      data: { ownerId: alice.id, title: 'Empty' },
    });
    await assert.rejects(
      resolver.resolve(alice.id, empty.id, { scope: 'PROJECT' }),
      /no eligible text/,
    );
  });
});
