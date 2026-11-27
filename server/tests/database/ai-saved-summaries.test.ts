import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P4-T14 saves summaries and source snapshots atomically, with stale flags and no reread provider calls', async () => {
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return {
      title: 'Saved concepts',
      sections: [
        { heading: null, text: 'Grounded concepts.', sourceKeys: data.allowedSourceKeys },
      ],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    const notes = await Promise.all(
      ['A', 'B'].map((title) =>
        db.note.create({ data: { projectId: project.id, title, plainText: title } }),
      ),
    );
    const generated = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({
        operation: 'SUMMARY',
        source: { scope: 'PROJECT' },
        settings: { length: 'SHORT', format: 'PARAGRAPHS' },
      });
    const save = () =>
      api
        .post('/api/v1/projects/' + project.id + '/summaries')
        .set('Authorization', 'Bearer alice')
        .send({ generationId: generated.body.data.id });
    const accepted = await save();
    assert.equal(accepted.status, 201);
    const id = accepted.body.data.id;
    assert.equal(accepted.body.data.staleSources, false);
    assert.equal((await save()).body.data.id, id);
    await db.note.update({
      where: { id: notes[0]!.id },
      data: { revision: 2, plainText: 'Changed' },
    });
    await db.note.update({
      where: { id: notes[1]!.id },
      data: { deletedAt: new Date() },
    });
    const reread = await api
      .get('/api/v1/summaries/' + id)
      .set('Authorization', 'Bearer alice');
    assert.equal(reread.body.data.staleSources, true);
    assert.ok(reread.body.data.sources.every((s: { stale: boolean }) => s.stale));
    const history = await api
      .get('/api/v1/projects/' + project.id + '/summaries')
      .set('Authorization', 'Bearer alice');
    assert.equal(history.body.total, 1);
    assert.equal(client.calls.length, 1);
    assert.equal(
      (await api.get('/api/v1/summaries/' + id).set('Authorization', 'Bearer bob'))
        .status,
      404,
    );
  }, client);
});
