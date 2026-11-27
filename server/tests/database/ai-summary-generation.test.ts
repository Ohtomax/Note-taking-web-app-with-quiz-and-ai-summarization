import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P4-T12 note/excerpt HTTP generation uses exact owned server text and never edits notes', async () => {
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return {
      title: 'Transport',
      sections: [
        {
          heading: null,
          text: 'A grounded summary.',
          sourceKeys: data.allowedSourceKeys,
        },
      ],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    const note = await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'PRIVATE ONLY END' },
    });
    const url = '/api/v1/projects/' + project.id + '/generations';
    const settings = { length: 'SHORT', format: 'PARAGRAPHS' };
    for (const source of [
      { scope: 'NOTE', noteId: note.id, revision: 1 },
      { scope: 'EXCERPT', noteId: note.id, revision: 1, start: 8, end: 12 },
    ]) {
      const response = await api
        .post(url)
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', randomUUID())
        .send({ operation: 'SUMMARY', source, settings });
      assert.equal(response.status, 201);
      assert.equal(response.body.data.status, 'SUCCEEDED');
    }
    const envelope = JSON.parse(client.calls[1]!.prompt) as {
      sources: Array<{ text: string }>;
    };
    assert.equal(envelope.sources[0]!.text, 'ONLY');
    assert.ok(!client.calls[1]!.prompt.includes('PRIVATE'));
    assert.deepEqual(await db.note.findUniqueOrThrow({ where: { id: note.id } }), note);
    const foreign = await api
      .post(url)
      .set('Authorization', 'Bearer bob')
      .set('Idempotency-Key', randomUUID())
      .send({
        operation: 'SUMMARY',
        source: { scope: 'NOTE', noteId: note.id, revision: 1 },
        settings,
      });
    assert.equal(foreign.status, 404);
    assert.equal(client.calls.length, 2);
  }, client);
});
