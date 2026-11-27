import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T07 concurrent starts deduplicate a version-bound attempt and preserve initial order', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    const url = '/api/v1/quizzes/' + quiz.id + '/attempts',
      key = randomUUID(),
      body = {
        versionId: version.id,
        mode: 'EXAM',
        shuffleQuestions: false,
        shuffleOptions: false,
      };
    const start = (requestKey: string, token = 'alice', input = body) =>
      api
        .post(url)
        .set('Authorization', 'Bearer ' + token)
        .set('Idempotency-Key', requestKey)
        .send(input);
    const [a, b] = await Promise.all([start(key), start(key)]);
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.body.data.id, b.body.data.id);
    assert.deepEqual(
      a.body.data.questionOrder,
      version.questions.map((q) => q.id),
    );
    assert.equal((await start(key, 'alice', { ...body, mode: 'PRACTICE' })).status, 409);
    const fresh = await start(randomUUID());
    assert.notEqual(fresh.body.data.id, a.body.data.id);
    assert.equal((await start(randomUUID(), 'bob')).status, 404);
    assert.equal(await db.quizAttempt.count({ where: { versionId: version.id } }), 2);
    assert.ok(!JSON.stringify(a.body).includes('isCorrect'));
    assert.ok(!JSON.stringify(a.body).includes('acceptedAnswers'));
  });
});
