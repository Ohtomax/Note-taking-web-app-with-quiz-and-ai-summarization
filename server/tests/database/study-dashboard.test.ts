import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorkspace } from './workspace.fixture.ts';
import { seedAnalyticsFixture } from './analytics.fixture.ts';
test('dashboard bounds recents, separates note opening from edits, and scopes accounts', async () => {
  await withWorkspace(async ({ db, api, project, foreign }) => {
    let response = await api.get('/api/v1/dashboard').auth('alice', { type: 'bearer' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.performance.totals.completedAttempts, 0);
    await seedAnalyticsFixture(db, api, project.id, foreign.id);
    const old = await db.note.create({
      data: {
        projectId: project.id,
        title: 'Older note',
        updatedAt: new Date('2020-01-01'),
        lastOpenedAt: new Date('2020-01-01'),
      },
    });
    const fresh = await db.note.create({
      data: { projectId: project.id, title: 'Newer note', lastOpenedAt: new Date() },
    });
    const open = await api
      .post('/api/v1/projects/' + project.id + '/notes/' + old.id + '/open')
      .auth('alice', { type: 'bearer' })
      .send({});
    assert.equal(open.status, 200);
    const saved = await db.note.findUniqueOrThrow({ where: { id: old.id } });
    assert.equal(saved.updatedAt.toISOString(), old.updatedAt.toISOString());
    assert.equal(saved.revision, old.revision);
    response = await api.get('/api/v1/dashboard').auth('alice', { type: 'bearer' });
    const data = response.body.data;
    assert.equal(data.recent.notes[0].id, old.id);
    assert.equal(data.recent.notes[1].id, fresh.id);
    assert.equal(data.performance.totals.meanScore, 62.5);
    for (const values of Object.values(data.recent))
      assert.ok((values as unknown[]).length <= 6);
    assert.equal(
      (
        await api
          .post('/api/v1/projects/' + project.id + '/notes/' + old.id + '/open')
          .auth('bob', { type: 'bearer' })
          .send({})
      ).status,
      404,
    );
    const bob = await api.get('/api/v1/dashboard').auth('bob', { type: 'bearer' });
    assert.ok(!bob.body.data.recent.notes.some((n: { id: string }) => n.id === old.id));
  });
});
