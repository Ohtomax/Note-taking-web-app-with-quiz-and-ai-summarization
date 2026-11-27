import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorkspace } from './workspace.fixture.ts';
test('P3-T01 project creation derives its owner and rejects invalid fields without writes', async () => {
  await withWorkspace(async ({ db, alice, bob, api }) => {
    const before = await db.project.count({ where: { ownerId: alice.id } });
    const response = await api
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer alice')
      .send({ title: 'Course', color: 'blue', icon: 'book' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.ownerId, alice.id);
    for (const body of [{ title: '' }, { title: 'Course', ownerId: bob.id }])
      assert.equal(
        (
          await api
            .post('/api/v1/projects')
            .set('Authorization', 'Bearer alice')
            .send(body)
        ).status,
        400,
      );
    assert.equal(await db.project.count({ where: { ownerId: alice.id } }), before + 1);
  });
});
