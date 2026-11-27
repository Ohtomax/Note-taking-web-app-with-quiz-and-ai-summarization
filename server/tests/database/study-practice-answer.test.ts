import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T10 practice races commit one immutable answer and reveal only its feedback after commit', async () => {
  await withWorkspace(async ({ db, project, foreign, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id),
      other = await seedStudyQuiz(db, foreign.id);
    const start = await api
      .post('/api/v1/quizzes/' + quiz.id + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'PRACTICE' });
    const id = start.body.data.id,
      q = version.questions[0]!,
      url = '/api/v1/attempts/' + id + '/answers/' + q.id;
    const answer = (optionId: string, token = 'alice') =>
      api
        .put(url)
        .set('Authorization', 'Bearer ' + token)
        .send({ expectedAnswerRevision: 0, optionIds: [optionId] });
    const results = await Promise.all([
      answer(q.options[0]!.id),
      answer(q.options[1]!.id),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const stored = await db.quizAttemptAnswer.findMany({ where: { attemptId: id } });
    assert.equal(stored.length, 1);
    const selected = stored[0]!.selectedOptionIds as string[];
    const replay = await answer(selected[0]!);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data.questions[0].feedback.isCorrect, stored[0]!.isCorrect);
    assert.ok(
      replay.body.data.questions
        .slice(1)
        .every((question: { feedback?: unknown }) => !question.feedback),
    );
    assert.equal((await answer(q.options[0]!.id, 'bob')).status, 404);
    assert.equal(
      (
        await api
          .put('/api/v1/attempts/' + id + '/answers/' + other.version.questions[0]!.id)
          .set('Authorization', 'Bearer alice')
          .send({ optionIds: [other.version.questions[0]!.options[0]!.id] })
      ).status,
      404,
    );
    assert.equal(await db.quizAttemptAnswer.count({ where: { attemptId: id } }), 1);
  });
});
