import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T17 history pages break tied times by ID and preserve private project/version/status metadata', async () => {
  await withWorkspace(async ({ db, project, foreign, alice, api }) => {
    const second = await db.project.create({
      data: { ownerId: alice.id, title: 'Second project' },
    });
    const own = await seedStudyQuiz(db, project.id),
      other = await seedStudyQuiz(db, second.id),
      outside = await seedStudyQuiz(db, foreign.id);
    const stamp = new Date(Date.now() - 60000);
    for (const [versionId, status] of [
      [own.version.id, 'COMPLETED'],
      [own.version.id, 'IN_PROGRESS'],
      [other.version.id, 'COMPLETED'],
      [other.version.id, 'ABANDONED'],
      [outside.version.id, 'COMPLETED'],
    ] as const)
      await db.quizAttempt.create({
        data: {
          versionId,
          requestKey: randomUUID(),
          mode: 'EXAM',
          status,
          totalQuestions: 4,
          startedAt: stamp,
          ...(status === 'COMPLETED'
            ? {
                correctCount: 2,
                answeredCount: 3,
                finishedAt: new Date(stamp.getTime() + 1000),
              }
            : {}),
        },
      });
    const get = (path: string) => api.get(path).set('Authorization', 'Bearer alice');
    const a = await get('/api/v1/attempts?pageSize=2'),
      b = await get('/api/v1/attempts?pageSize=2&page=2');
    assert.equal(a.status, 200);
    assert.equal(a.body.total, 4);
    const ids = [...a.body.data, ...b.body.data].map((row: { id: string }) => row.id);
    assert.equal(new Set(ids).size, 4);
    assert.deepEqual(ids, [...ids].sort().reverse());
    const filtered = await get('/api/v1/attempts?projectId=' + project.id);
    assert.equal(filtered.body.total, 2);
    assert.ok(
      filtered.body.data.every(
        (row: { projectId: string }) => row.projectId === project.id,
      ),
    );
    assert.equal(
      filtered.body.data.find((row: { status: string }) => row.status === 'IN_PROGRESS')
        .percentage,
      null,
    );
    assert.equal((await get('/api/v1/attempts?projectId=' + foreign.id)).status, 404);
    const foreignAttempt = await db.quizAttempt.findFirstOrThrow({
      where: { versionId: outside.version.id },
    });
    assert.equal((await get('/api/v1/attempts/' + foreignAttempt.id)).status, 404);
    assert.ok(!JSON.stringify(a.body).includes('acceptedAnswers'));
    assert.ok(!JSON.stringify(a.body).includes('correctOptionIds'));
  });
});
