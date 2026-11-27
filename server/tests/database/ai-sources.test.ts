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
