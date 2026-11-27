import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P4-T13 selected and complete folders retain all source references through map/reduce', async () => {
  let interrupt = false;
  const client = createMockAIClient((request, index) => {
    const data = JSON.parse(request.prompt) as {
      stage: string;
      allowedSourceKeys: string[];
      sources: Array<{ text: string }>;
    };
    if (interrupt && data.stage === 'MAP' && index > 1) throw new Error('Interrupted');
    if (data.stage !== 'FINAL')
      return {
        sections: data.allowedSourceKeys.map((key) => ({
          text: 'Grounded transport concept',
          sourceKeys: [key],
        })),
      };
    return {
      title: 'Combined transport',
      sections: [
        {
          heading: 'Concepts',
          text: 'Related source concepts combined.',
          sourceKeys: data.allowedSourceKeys,
        },
      ],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    const notes = await Promise.all(
      ['TCP', 'UDP', 'IP'].map((title) =>
        db.note.create({
          data: { projectId: project.id, title, plainText: (title + ' ').repeat(7000) },
        }),
      ),
    );
    const url = '/api/v1/projects/' + project.id + '/generations';
    for (const source of [
      { scope: 'NOTES', noteIds: notes.slice(0, 2).map((n) => n.id) },
      { scope: 'PROJECT' },
    ]) {
      const response = await api
        .post(url)
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', randomUUID())
        .send({
          operation: 'SUMMARY',
          source,
          settings: { length: 'MEDIUM', format: 'STUDY_GUIDE' },
        });
      assert.equal(response.status, 201);
      assert.equal(response.body.data.status, 'SUCCEEDED');
      assert.equal(
        response.body.data.result.sources.length,
        source.scope === 'PROJECT' ? 3 : 2,
      );
    }
    assert.ok(client.calls.some((c) => c.system.includes('Stage: MERGE')));
    interrupt = true;
    const failed = await api
      .post(url)
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({
        operation: 'SUMMARY',
        source: { scope: 'PROJECT' },
        settings: { length: 'MEDIUM', format: 'STUDY_GUIDE' },
      });
    assert.equal(failed.body.data.status, 'UNCERTAIN');
    assert.equal(failed.body.data.result, null);
    assert.equal(await db.summary.count({ where: { projectId: project.id } }), 0);
  }, client);
});
