import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { validQuiz } from '../fixtures/ai.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P5-T16 retakes pin the reviewed version after an edit and persist independent shuffled order without AI', async () => {
  const client = createMockAIClient(() => {
    throw new Error('Retakes must never generate');
  });
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version, settings } = await seedStudyQuiz(db, project.id),
      url = '/api/v1/quizzes/' + quiz.id + '/attempts';
    const first = await api
      .post(url)
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    await api
      .post('/api/v1/attempts/' + first.body.data.id + '/submit')
      .set('Authorization', 'Bearer alice')
      .send({});
    const original = await db.quizAttempt.findUniqueOrThrow({
      where: { id: first.body.data.id },
      include: { answers: true },
    });
    const changed = validQuiz(settings, ['source']);
    changed.questions[0]!.prompt = 'New wording';
    assert.equal(
      (
        await api
          .post('/api/v1/quizzes/' + quiz.id + '/versions')
          .set('Authorization', 'Bearer alice')
          .send({ expectedVersion: 1, settings, content: changed })
      ).status,
      201,
    );
    const key = randomUUID(),
      body = {
        versionId: version.id,
        mode: 'PRACTICE',
        shuffleQuestions: true,
        shuffleOptions: true,
      };
    const retake = () =>
      api
        .post(url)
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', key)
        .send(body);
    const [a, b] = await Promise.all([retake(), retake()]);
    assert.equal(a.status, 201);
    assert.equal(a.body.data.id, b.body.data.id);
    assert.notEqual(a.body.data.id, original.id);
    assert.equal(a.body.data.versionId, version.id);
    assert.equal(a.body.data.answers.length, 0);
    assert.deepEqual(
      [...a.body.data.questionOrder].sort(),
      version.questions.map((question) => question.id).sort(),
    );
    const reloaded = await api
      .get('/api/v1/attempts/' + a.body.data.id)
      .set('Authorization', 'Bearer alice');
    assert.deepEqual(reloaded.body.data.questionOrder, a.body.data.questionOrder);
    assert.deepEqual(reloaded.body.data.optionOrder, a.body.data.optionOrder);
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({
        where: { id: original.id },
        include: { answers: true },
      }),
      original,
    );
    assert.equal(await db.quizAttempt.count({ where: { versionId: version.id } }), 2);
    assert.equal(client.calls.length, 0);
  }, client);
});
