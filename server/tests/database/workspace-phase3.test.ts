import { randomUUID } from 'node:crypto';
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

test('P3-T02 projects search and pagination isolate owners and count active notes', async () => {
  await withWorkspace(async ({ db, alice, project, foreign, api }) => {
    await db.note.createMany({
      data: [
        { title: 'Active', projectId: project.id },
        { title: 'Archived', projectId: project.id, archivedAt: new Date() },
        { title: 'Deleted', projectId: project.id, deletedAt: new Date() },
        { title: 'Foreign', projectId: foreign.id },
      ],
    });
    const stamp = new Date('2026-01-01T00:00:00Z');
    await db.project.createMany({
      data: [
        { ownerId: alice.id, title: 'Networking 2', updatedAt: stamp },
        { ownerId: alice.id, title: 'Networking 3', updatedAt: stamp },
        { ownerId: alice.id, title: 'Networking old', archivedAt: stamp },
      ],
    });
    const first = await api
      .get('/api/v1/projects?search=network&pageSize=2&sort=title&order=asc')
      .set('Authorization', 'Bearer alice');
    const second = await api
      .get('/api/v1/projects?search=network&pageSize=2&page=2&sort=title&order=asc')
      .set('Authorization', 'Bearer alice');
    assert.equal(first.status, 200);
    assert.equal(first.body.total, 3);
    assert.equal(
      new Set([...first.body.data, ...second.body.data].map((p: { id: string }) => p.id))
        .size,
      3,
    );
    assert.equal(
      first.body.data.find((p: { id: string }) => p.id === project.id).noteCount,
      1,
    );
  });
});

test('P3-T03 owner detail hides missing and foreign projects identically', async () => {
  await withWorkspace(async ({ project, api }) => {
    const own = await api
      .get('/api/v1/projects/' + project.id)
      .set('Authorization', 'Bearer alice');
    assert.equal(own.status, 200);
    assert.equal(own.body.data.id, project.id);
    const foreign = await api
      .get('/api/v1/projects/' + project.id)
      .set('Authorization', 'Bearer bob');
    const absent = await api
      .get('/api/v1/projects/' + randomUUID())
      .set('Authorization', 'Bearer bob');
    assert.equal(foreign.status, 404);
    assert.deepEqual(foreign.body.error, absent.body.error);
  });
});

test('P3-T04 partial metadata updates preserve ownership and reject invalid colors', async () => {
  await withWorkspace(async ({ db, alice, bob, project, api }) => {
    const update = await api
      .patch('/api/v1/projects/' + project.id)
      .set('Authorization', 'Bearer alice')
      .send({ expectedRevision: 1, title: 'Renamed' });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.title, 'Renamed');
    assert.equal(update.body.data.revision, 2);
    for (const fields of [{ color: 'invalid' }, { ownerId: bob.id }])
      assert.equal(
        (
          await api
            .patch('/api/v1/projects/' + project.id)
            .set('Authorization', 'Bearer alice')
            .send({ expectedRevision: 2, ...fields })
        ).status,
        400,
      );
    assert.equal(
      (await db.project.findUniqueOrThrow({ where: { id: project.id } })).ownerId,
      alice.id,
    );
    assert.equal(
      (
        await api
          .patch('/api/v1/projects/' + project.id)
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 1, title: 'Stale' })
      ).status,
      409,
    );
  });
});

test('P3-T05 project archive and restore converge and preserve contents', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const note = await db.note.create({ data: { projectId: project.id, title: 'Keep' } });
    const archived = await api
      .post('/api/v1/projects/' + project.id + '/archive')
      .set('Authorization', 'Bearer alice')
      .send({ expectedRevision: 1 });
    assert.equal(archived.status, 200);
    assert.equal(
      (
        await api
          .post('/api/v1/projects/' + project.id + '/archive')
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 1 })
      ).status,
      200,
    );
    assert.equal(
      (await api.get('/api/v1/projects').set('Authorization', 'Bearer alice')).body.total,
      0,
    );
    assert.equal(
      (
        await api
          .patch('/api/v1/projects/' + project.id)
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 2, title: 'Blocked' })
      ).status,
      409,
    );
    assert.equal(
      (
        await api
          .post('/api/v1/projects/' + project.id + '/restore')
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 2 })
      ).status,
      200,
    );
    assert.equal(
      (await api.get('/api/v1/projects').set('Authorization', 'Bearer alice')).body.total,
      1,
    );
    assert.equal(
      (await db.note.findUniqueOrThrow({ where: { id: note.id } })).title,
      'Keep',
    );
  });
});
