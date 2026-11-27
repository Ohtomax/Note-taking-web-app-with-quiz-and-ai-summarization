import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withWorkspace } from './workspace.fixture.ts';

test('P3-T24 every foreign project/note route rejects both identities without changing stored records', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const notes = await Promise.all(
      [project, foreign].map((parent) =>
        db.note.create({
          data: {
            projectId: parent.id,
            title: 'Private',
            content: { type: 'doc', content: [{ type: 'paragraph' }] },
            plainText: '',
          },
        }),
      ),
    );
    const snapshot = async () => ({
      projects: await db.project.findMany({
        where: { id: { in: [project.id, foreign.id] } },
        orderBy: { id: 'asc' },
      }),
      notes: await db.note.findMany({
        where: { projectId: { in: [project.id, foreign.id] } },
        orderBy: { id: 'asc' },
      }),
    });
    const before = await snapshot();
    for (const [token, parent, note, ownParent] of [
      ['alice', foreign, notes[1]!, project],
      ['bob', project, notes[0]!, foreign],
    ] as const) {
      const base = '/api/v1/projects/' + parent.id;
      const notePath = base + '/notes/' + note.id;
      const cases: Array<{
        method: 'get' | 'post' | 'patch' | 'delete';
        path: string;
        body?: Record<string, unknown>;
      }> = [
        { method: 'get', path: base },
        { method: 'get', path: base + '/deletion-preview' },
        {
          method: 'patch',
          path: base,
          body: { title: 'Forbidden', expectedRevision: 1 },
        },
        { method: 'post', path: base + '/archive', body: { expectedRevision: 1 } },
        { method: 'post', path: base + '/restore', body: { expectedRevision: 1 } },
        { method: 'delete', path: base, body: { confirmed: true, impactRevision: 1 } },
        { method: 'get', path: base + '/notes' },
        { method: 'post', path: base + '/notes', body: { title: 'Forbidden' } },
        { method: 'get', path: notePath },
        {
          method: 'patch',
          path: notePath,
          body: { title: 'Forbidden', expectedRevision: 1 },
        },
        {
          method: 'post',
          path: notePath + '/pin',
          body: { pinned: true, expectedRevision: 1 },
        },
        { method: 'post', path: notePath + '/archive', body: { expectedRevision: 1 } },
        { method: 'post', path: notePath + '/restore', body: { expectedRevision: 1 } },
        { method: 'post', path: notePath + '/duplicate', body: { expectedRevision: 1 } },
        {
          method: 'post',
          path: notePath + '/move',
          body: { expectedRevision: 1, destinationProjectId: ownParent.id },
        },
        {
          method: 'delete',
          path: notePath,
          body: { expectedRevision: 1, confirmed: true },
        },
        { method: 'get', path: '/api/v1/projects/' + ownParent.id + '/notes/' + note.id },
        {
          method: 'patch',
          path: '/api/v1/projects/' + ownParent.id + '/notes/' + note.id,
          body: { title: 'Forged parent', expectedRevision: 1 },
        },
      ];
      for (const item of cases) {
        let request = api[item.method](item.path).set('Authorization', 'Bearer ' + token);
        if (item.body) request = request.send(item.body);
        const response = await request;
        assert.equal(response.status, 404, item.method + ' ' + item.path);
        assert.deepEqual(
          await snapshot(),
          before,
          'Rejected request changed stored records',
        );
      }
      assert.equal((await api.get(notePath)).status, 401);
      assert.equal(
        (await api.get(notePath).set('Authorization', 'Bearer invalid')).status,
        401,
      );
      assert.deepEqual(await snapshot(), before);
    }
  });
});
