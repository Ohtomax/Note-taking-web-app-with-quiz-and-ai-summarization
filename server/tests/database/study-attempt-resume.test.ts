import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T13 saved location/order resume, abandonment is terminal and expired attempts leave open lists', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    const start = () =>
      api
        .post('/api/v1/quizzes/' + quiz.id + '/attempts')
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', randomUUID())
        .send({
          versionId: version.id,
          mode: 'EXAM',
          shuffleQuestions: true,
          shuffleOptions: true,
        });
    const first = await start(),
      id = first.body.data.id,
      base = '/api/v1/attempts/' + id;
    assert.equal(
      (
        await api
          .patch(base + '/location')
          .set('Authorization', 'Bearer alice')
          .send({ questionIndex: 2 })
      ).status,
      200,
    );
    const reloaded = await api.get(base).set('Authorization', 'Bearer alice');
    assert.equal(reloaded.body.data.lastQuestionIndex, 2);
    assert.deepEqual(reloaded.body.data.questionOrder, first.body.data.questionOrder);
    assert.deepEqual(reloaded.body.data.optionOrder, first.body.data.optionOrder);
    assert.equal(
      (await api.get('/api/v1/attempts/in-progress').set('Authorization', 'Bearer alice'))
        .body.total,
      1,
    );
    assert.equal(
      (await api.get('/api/v1/attempts/in-progress').set('Authorization', 'Bearer bob'))
        .body.total,
      0,
    );
    const abandoned = await api
      .post(base + '/abandon')
      .set('Authorization', 'Bearer alice')
      .send({ confirmed: true });
    assert.equal(abandoned.body.data.status, 'ABANDONED');
    assert.equal(
      (
        await api
          .post(base + '/submit')
          .set('Authorization', 'Bearer alice')
          .send({})
      ).status,
      409,
    );
    assert.equal(
      (
        await api
          .patch(base + '/location')
          .set('Authorization', 'Bearer alice')
          .send({ questionIndex: 1 })
      ).status,
      409,
    );
    const expired = await start();
    await db.quizAttempt.update({
      where: { id: expired.body.data.id },
      data: { startedAt: new Date(Date.now() - 8 * 86400000) },
    });
    const read = await api
      .get('/api/v1/attempts/' + expired.body.data.id)
      .set('Authorization', 'Bearer alice');
    assert.equal(read.body.data.status, 'ABANDONED');
    assert.equal(read.body.data.result, undefined);
    assert.equal(
      (await api.get('/api/v1/attempts/in-progress').set('Authorization', 'Bearer alice'))
        .body.total,
      0,
    );
  });
});
