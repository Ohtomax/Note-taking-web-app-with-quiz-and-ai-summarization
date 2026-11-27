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

test('P3-T06 project deletion rejects stale impact and preserves historical attempts', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({ data: { projectId: project.id, title: 'Keep' } });
    const quiz = await db.quiz.create({
      data: {
        projectId: project.id,
        title: 'Quiz',
        versions: { create: { version: 1, difficulty: 'EASY', promptVersion: 'test' } },
      },
      include: { versions: true },
    });
    const attempt = await db.quizAttempt.create({
      data: {
        versionId: quiz.versions[0]!.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        totalQuestions: 1,
        status: 'COMPLETED',
        correctCount: 1,
        answeredCount: 1,
        finishedAt: new Date(),
      },
    });
    const preview = await api
      .get('/api/v1/projects/' + project.id + '/deletion-preview')
      .set('Authorization', 'Bearer alice');
    assert.equal(preview.body.data.notes, 1);
    assert.equal(preview.body.data.retainedAttempts, 1);
    await api
      .patch('/api/v1/projects/' + project.id)
      .set('Authorization', 'Bearer alice')
      .send({ expectedRevision: 1, title: 'Changed' });
    assert.equal(
      (
        await api
          .delete('/api/v1/projects/' + project.id)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: true, impactRevision: 1 })
      ).status,
      409,
    );
    assert.equal(
      (
        await api
          .delete('/api/v1/projects/' + project.id)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: false, impactRevision: 2 })
      ).status,
      400,
    );
    assert.equal(
      (
        await api
          .delete('/api/v1/projects/' + project.id)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: true, impactRevision: 2 })
      ).status,
      204,
    );
    assert.equal(
      (await db.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
        .correctCount,
      1,
    );
  });
});

test('P3-T08 note creation and read require matching owned parent', async () => {
  await withWorkspace(async ({ project, foreign, api }) => {
    const created = await api
      .post('/api/v1/projects/' + project.id + '/notes')
      .set('Authorization', 'Bearer alice')
      .send({ title: 'OSI' });
    assert.equal(created.status, 201);
    const id = created.body.data.id;
    assert.equal(created.body.data.revision, 1);
    assert.equal(
      (
        await api
          .get('/api/v1/projects/' + project.id + '/notes/' + id)
          .set('Authorization', 'Bearer alice')
      ).status,
      200,
    );
    assert.equal(
      (
        await api
          .get('/api/v1/projects/' + project.id + '/notes/' + id)
          .set('Authorization', 'Bearer bob')
      ).status,
      404,
    );
    assert.equal(
      (
        await api
          .get('/api/v1/projects/' + foreign.id + '/notes/' + id)
          .set('Authorization', 'Bearer alice')
      ).status,
      404,
    );
  });
});

test('P3-T09 concurrent note revisions allow one winner and preserve newer content', async () => {
  await withWorkspace(async ({ project, api }) => {
    const created = await api
      .post('/api/v1/projects/' + project.id + '/notes')
      .set('Authorization', 'Bearer alice')
      .send({ title: 'Original' });
    const url = '/api/v1/projects/' + project.id + '/notes/' + created.body.data.id;
    const writes = await Promise.all(
      ['First', 'Second'].map((title) =>
        api
          .patch(url)
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 1, title }),
      ),
    );
    assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
    const saved = await api.get(url).set('Authorization', 'Bearer alice');
    assert.equal(saved.body.data.revision, 2);
    assert.equal(
      saved.body.data.title,
      writes.find((r) => r.status === 200)!.body.data.title,
    );
  });
});

test('P3-T10 note lists search extracted content with stable paging and owner scope', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Searchable layer', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    };
    await api
      .post('/api/v1/projects/' + project.id + '/notes')
      .set('Authorization', 'Bearer alice')
      .send({ title: 'OSI', content: doc });
    await db.note.createMany({
      data: [
        { projectId: project.id, title: 'Another', plainText: 'Searchable layer' },
        { projectId: foreign.id, title: 'Foreign', plainText: 'Searchable layer' },
      ],
    });
    const url =
      '/api/v1/projects/' +
      project.id +
      '/notes?search=layer&sort=title&order=asc&pageSize=1';
    const first = await api.get(url).set('Authorization', 'Bearer alice');
    const second = await api.get(url + '&page=2').set('Authorization', 'Bearer alice');
    assert.equal(first.status, 200);
    assert.equal(first.body.total, 2);
    assert.notEqual(first.body.data[0].id, second.body.data[0].id);
  });
});

test('P3-T11 pin and unpin persist and reject foreign writers', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const note = await db.note.create({ data: { projectId: project.id, title: 'Pin' } });
    const url = '/api/v1/projects/' + project.id + '/notes/' + note.id + '/pin';
    for (const token of ['alice', 'alice'])
      assert.equal(
        (
          await api
            .post(url)
            .set('Authorization', 'Bearer ' + token)
            .send({ expectedRevision: 1, pinned: true })
        ).status,
        200,
      );
    assert.equal(
      (await db.note.findUniqueOrThrow({ where: { id: note.id } })).pinned,
      true,
    );
    assert.equal(
      (
        await api
          .post(url)
          .set('Authorization', 'Bearer bob')
          .send({ expectedRevision: 2, pinned: false })
      ).status,
      404,
    );
    assert.equal(
      (
        await api
          .post(url)
          .set('Authorization', 'Bearer alice')
          .send({ expectedRevision: 2, pinned: false })
      ).status,
      200,
    );
    assert.equal(
      (await db.note.findUniqueOrThrow({ where: { id: note.id } })).pinned,
      false,
    );
  });
});
