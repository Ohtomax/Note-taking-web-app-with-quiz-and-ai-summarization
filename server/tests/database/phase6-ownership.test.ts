import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import type {
  User,
  Project,
  Note,
  Summary,
  AIUsage,
} from '../../src/generated/prisma/client.ts';
type StudyResource = Pick<
  Awaited<ReturnType<typeof seedStudyQuiz>>,
  'quiz' | 'version'
> & {
  owner: User;
  parent: Project;
  token: 'alice' | 'bob';
  note: Note;
  summary: Summary;
  attemptId: string;
  usage: AIUsage;
};
test('P6-T02 both identities reject foreign study reads and mutations without changing either workspace', async () => {
  const client = createMockAIClient(() => {
    throw Error('Rejected reads/writes must not generate');
  });
  await withWorkspace(async ({ db, api, alice, bob, project, foreign }) => {
    const resources: StudyResource[] = [];
    for (const [owner, parent, token] of [
      [alice, project, 'alice'],
      [bob, foreign, 'bob'],
    ] as const) {
      const note = await db.note.create({
        data: { projectId: parent.id, title: token + ' private note', plainText: 'TCP' },
      });
      const summary = await db.summary.create({
        data: {
          projectId: parent.id,
          title: token + ' summary',
          content: {
            title: 'Summary',
            sections: [{ heading: null, text: 'TCP', sourceKeys: ['source'] }],
          },
          settings: { length: 'SHORT', format: 'PARAGRAPHS' },
        },
      });
      const { quiz, version } = await seedStudyQuiz(db, parent.id);
      const start = await api
        .post('/api/v1/quizzes/' + quiz.id + '/attempts')
        .auth(token, { type: 'bearer' })
        .set('Idempotency-Key', randomUUID())
        .send({ versionId: version.id, mode: 'EXAM' });
      assert.equal(start.status, 201);
      const usage = await db.aIUsage.create({
        data: {
          userId: owner.id,
          requestKey: randomUUID(),
          inputHash: 'a'.repeat(64),
          operation: 'SUMMARY',
          provider: 'mock',
          model: 'fixed',
          status: 'FAILED',
        },
      });
      resources.push({
        owner,
        parent,
        token,
        note,
        summary,
        quiz,
        version,
        attemptId: start.body.data.id as string,
        usage,
      });
    }
    const ownerIds = [alice.id, bob.id],
      parentIds = [project.id, foreign.id],
      owned = { project: { ownerId: { in: ownerIds } } };
    const snapshot = async () => ({
      projects: await db.project.findMany({
        where: { id: { in: parentIds } },
        orderBy: { id: 'asc' },
      }),
      notes: await db.note.findMany({ where: owned, orderBy: { id: 'asc' } }),
      summaries: await db.summary.findMany({
        where: owned,
        orderBy: { id: 'asc' },
        include: { sources: true },
      }),
      quizzes: await db.quiz.findMany({
        where: owned,
        orderBy: { id: 'asc' },
        include: {
          versions: {
            orderBy: { version: 'asc' },
            include: {
              questions: {
                orderBy: { id: 'asc' },
                include: { options: { orderBy: { id: 'asc' } } },
              },
              sources: true,
              attempts: { include: { answers: true } },
            },
          },
        },
      }),
      usage: await db.aIUsage.findMany({
        where: { userId: { in: ownerIds } },
        orderBy: { id: 'asc' },
        include: { calls: true },
      }),
    });
    const before = await snapshot();
    for (const [index, target] of resources.entries()) {
      const caller = resources[1 - index]!,
        quiz = '/api/v1/quizzes/' + target.quiz.id,
        attempt = '/api/v1/attempts/' + target.attemptId,
        summary = '/api/v1/summaries/' + target.summary.id;
      const cases: Array<{
        method: 'get' | 'post' | 'put' | 'patch' | 'delete';
        path: string;
        body?: object;
      }> = [
        { method: 'get', path: quiz },
        { method: 'patch', path: quiz, body: { title: 'Forged' } },
        { method: 'delete', path: quiz, body: { confirmed: true } },
        { method: 'post', path: quiz + '/duplicate', body: { expectedVersion: 1 } },
        { method: 'get', path: quiz + '/versions' },
        { method: 'get', path: quiz + '/versions/' + target.version.id + '/authoring' },
        {
          method: 'post',
          path: quiz + '/attempts',
          body: { versionId: target.version.id, mode: 'EXAM' },
        },
        { method: 'get', path: quiz + '/analytics' },
        { method: 'get', path: '/api/v1/projects/' + target.parent.id + '/analytics' },
        { method: 'get', path: summary },
        { method: 'patch', path: summary, body: { title: 'Forged' } },
        { method: 'delete', path: summary, body: { confirmed: true } },
        { method: 'get', path: attempt },
        { method: 'get', path: attempt + '/results' },
        { method: 'get', path: attempt + '/comparison' },
        {
          method: 'put',
          path: attempt + '/answers/' + target.version.questions[0]!.id,
          body: { optionIds: [target.version.questions[0]!.options[0]!.id] },
        },
        { method: 'patch', path: attempt + '/location', body: { questionIndex: 1 } },
        { method: 'post', path: attempt + '/submit', body: {} },
        { method: 'post', path: attempt + '/abandon', body: { confirmed: true } },
        { method: 'get', path: '/api/v1/generations/' + target.usage.id },
        {
          method: 'post',
          path:
            '/api/v1/projects/' + target.parent.id + '/notes/' + target.note.id + '/open',
          body: {},
        },
        {
          method: 'post',
          path:
            '/api/v1/projects/' + caller.parent.id + '/notes/' + caller.note.id + '/move',
          body: { expectedRevision: 1, destinationProjectId: target.parent.id },
        },
      ];
      for (const row of cases) {
        let request = api[row.method](row.path)
          .auth(caller.token, { type: 'bearer' })
          .set('Idempotency-Key', randomUUID());
        if (row.body) request = request.send(row.body);
        assert.equal((await request).status, 404, row.method + ' ' + row.path);
        assert.deepEqual(
          await snapshot(),
          before,
          'rejected operation altered stored resources',
        );
      }
      for (const token of [undefined, 'expired', 'invalid']) {
        let request = api.get(attempt);
        if (token) request = request.auth(token, { type: 'bearer' });
        assert.equal((await request).status, 401);
      }
      const history = await api
        .get('/api/v1/attempts')
        .auth(caller.token, { type: 'bearer' });
      assert.equal(history.body.total, 1);
      assert.equal(history.body.data[0].quizId, caller.quiz.id);
      const usage = await api
        .get('/api/v1/ai-usage')
        .auth(caller.token, { type: 'bearer' });
      assert.equal(usage.body.total, 1);
      assert.equal(usage.body.data[0].id, caller.usage.id);
      const report = await api
        .get('/api/v1/analytics')
        .auth(caller.token, { type: 'bearer' });
      assert.equal(report.body.data.workspace.quizzes, 1);
      assert.equal(report.body.data.statusCounts.IN_PROGRESS, 1);
    }
    assert.equal(client.calls.length, 0);
    assert.deepEqual(await snapshot(), before);
  }, client);
});
