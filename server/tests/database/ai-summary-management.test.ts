import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient, AIProviderError } from '../../src/ai/client.ts';
test('P4-T15 editing is free and failed regeneration preserves the accepted summary', async () => {
  let fail = false;
  const client = createMockAIClient((request) => {
    if (fail) throw new AIProviderError('INVALID');
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return {
      title: 'Original',
      sections: [{ heading: null, text: 'Grounded', sourceKeys: data.allowedSourceKeys }],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'A', plainText: 'TCP' },
    });
    const input = {
      operation: 'SUMMARY',
      source: { scope: 'PROJECT' },
      settings: { length: 'SHORT', format: 'PARAGRAPHS' },
    };
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send(input);
    const saved = await api
      .post('/api/v1/projects/' + project.id + '/summaries')
      .set('Authorization', 'Bearer alice')
      .send({ generationId: gen.body.data.id });
    const id = saved.body.data.id,
      url = '/api/v1/summaries/' + id;
    const content = {
      ...saved.body.data.content,
      sections: [
        { ...saved.body.data.content.sections[0], text: 'Owner-edited study text' },
      ],
    };
    const edited = await api
      .patch(url)
      .set('Authorization', 'Bearer alice')
      .send({ title: 'Renamed', content });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.data.title, 'Renamed');
    assert.equal(client.calls.length, 1);
    const before = await db.summary.findUniqueOrThrow({ where: { id } });
    fail = true;
    const failed = await api
      .post(url + '/regenerate')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send(input);
    assert.equal(failed.body.data.status, 'FAILED');
    assert.deepEqual(await db.summary.findUniqueOrThrow({ where: { id } }), before);
    fail = false;
    const retry = await api
      .post(url + '/regenerate')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send(input);
    assert.equal(retry.body.data.status, 'SUCCEEDED');
    assert.deepEqual(await db.summary.findUniqueOrThrow({ where: { id } }), before);
    assert.equal(
      (await api.delete(url).set('Authorization', 'Bearer bob').send({ confirmed: true }))
        .status,
      404,
    );
    assert.equal(
      (
        await api
          .delete(url)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: true })
      ).status,
      204,
    );
    assert.equal(client.calls.length, 3);
  }, client);
});
