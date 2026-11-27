import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P5-T02 accepts edited summary previews only within captured source and length bounds', async () => {
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return {
      title: 'TCP',
      sections: [
        { heading: null, text: 'Original summary', sourceKeys: data.allowedSourceKeys },
      ],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    const note = await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP transports data' },
    });
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({
        operation: 'SUMMARY',
        source: { scope: 'PROJECT' },
        settings: { length: 'SHORT', format: 'PARAGRAPHS' },
      });
    const content = gen.body.data.result.output;
    const save = (value: unknown) =>
      api
        .post('/api/v1/projects/' + project.id + '/summaries')
        .set('Authorization', 'Bearer alice')
        .send({ generationId: gen.body.data.id, content: value });
    assert.equal(
      (
        await save({
          ...content,
          sections: [{ ...content.sections[0], sourceKeys: ['foreign'] }],
        })
      ).status,
      422,
    );
    const accepted = await save({
      ...content,
      sections: [{ ...content.sections[0], text: 'Owner-edited summary' }],
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.content.sections[0].text, 'Owner-edited summary');
    assert.deepEqual(await db.note.findUniqueOrThrow({ where: { id: note.id } }), note);
    assert.equal(client.calls.length, 1);
  }, client);
});
