import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T12 final submission serializes with drafts, records one finish and permanently locks results', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    const start = await api
      .post('/api/v1/quizzes/' + quiz.id + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    const id = start.body.data.id,
      q = version.questions[0]!,
      base = '/api/v1/attempts/' + id;
    const save = () =>
      api
        .put(base + '/answers/' + q.id)
        .set('Authorization', 'Bearer alice')
        .send({
          expectedAnswerRevision: 0,
          optionIds: [q.options.find((option) => option.isCorrect)!.id],
        });
    const submit = () =>
      api
        .post(base + '/submit')
        .set('Authorization', 'Bearer alice')
        .send({});
    const [write, finished, duplicate] = await Promise.all([save(), submit(), submit()]);
    assert.ok([200, 409].includes(write.status));
    assert.equal(finished.status, 200);
    assert.equal(duplicate.status, 200);
    assert.equal(finished.body.data.status, 'COMPLETED');
    assert.deepEqual(finished.body.data.result, duplicate.body.data.result);
    assert.equal(finished.body.data.finishedAt, duplicate.body.data.finishedAt);
    const row = await db.quizAttempt.findUniqueOrThrow({
      where: { id },
      include: { answers: true },
    });
    assert.equal(row.correctCount, row.answers.length ? 1 : 0);
    assert.equal(row.answeredCount, row.answers.length);
    assert.equal(finished.body.data.result.unansweredCount, 4 - row.answers.length);
    assert.equal((await save()).status, 409);
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({
        where: { id },
        include: { answers: true },
      }),
      row,
    );
    assert.equal(
      (
        await api
          .post(base + '/submit')
          .set('Authorization', 'Bearer bob')
          .send({})
      ).status,
      404,
    );
    assert.equal((await submit()).body.data.finishedAt, finished.body.data.finishedAt);
  });
});
