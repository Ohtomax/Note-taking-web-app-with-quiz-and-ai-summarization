import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';

test('retakes only incorrect answers and preserves the original attempt and its number', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    const start = (missedFromAttemptId?: string, key = randomUUID()) =>
      api
        .post('/api/v1/quizzes/' + quiz.id + '/attempts')
        .auth('alice', { type: 'bearer' })
        .set('Idempotency-Key', key)
        .send({ versionId: version.id, mode: 'EXAM', missedFromAttemptId });
    const first = await start();
    assert.equal(first.status, 201);
    assert.equal(first.body.data.attemptNumber, 1);
    const question = version.questions[0]!;
    const skipped = version.questions[1]!;
    const save = (id: string, questionId: string, optionId: string) =>
      api
        .put('/api/v1/attempts/' + id + '/answers/' + questionId)
        .auth('alice', { type: 'bearer' })
        .send({ optionIds: [optionId] });
    const submit = (id: string) =>
      api
        .post('/api/v1/attempts/' + id + '/submit')
        .auth('alice', { type: 'bearer' })
        .send({});
    assert.equal((await start(first.body.data.id)).status, 404);
    assert.equal(
      (
        await save(
          first.body.data.id,
          question.id,
          question.options.find((option) => !option.isCorrect)!.id,
        )
      ).status,
      200,
    );
    const completed = await submit(first.body.data.id);
    assert.equal(completed.body.data.result.incorrectCount, 1);
    assert.equal(completed.body.data.result.unansweredCount, 3);

    const key = randomUUID();
    const [second, duplicate] = await Promise.all([
      start(first.body.data.id, key),
      start(first.body.data.id, key),
    ]);
    assert.equal(second.status, 201);
    assert.equal(second.body.data.id, duplicate.body.data.id);
    assert.equal(second.body.data.attemptNumber, 2);
    assert.deepEqual(second.body.data.questionOrder, [question.id]);
    assert.equal(second.body.data.focusedReview, true);
    assert.equal(
      (await save(second.body.data.id, skipped.id, skipped.options[0]!.id)).status,
      404,
    );
    assert.equal(
      (
        await save(
          second.body.data.id,
          question.id,
          question.options.find((option) => option.isCorrect)!.id,
        )
      ).status,
      200,
    );
    assert.equal((await submit(second.body.data.id)).body.data.result.percentage, 100);
    assert.deepEqual((await submit(first.body.data.id)).body.data, completed.body.data);
    assert.equal(await db.quizAttempt.count({ where: { versionId: version.id } }), 2);
  });
});
