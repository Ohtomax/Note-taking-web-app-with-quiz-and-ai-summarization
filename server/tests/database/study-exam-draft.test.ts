import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T11 exam drafts preserve revisions and withhold grading across reads and clears', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    const start = await api
      .post('/api/v1/quizzes/' + quiz.id + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    const id = start.body.data.id,
      q = version.questions[0]!,
      url = '/api/v1/attempts/' + id + '/answers/' + q.id;
    const save = (revision: number, optionIds: string[]) =>
      api
        .put(url)
        .set('Authorization', 'Bearer alice')
        .send({ expectedAnswerRevision: revision, optionIds });
    const first = await save(0, [q.options[0]!.id]);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.answers[0].revision, 1);
    const second = await save(1, [q.options[1]!.id]);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.answers[0].revision, 2);
    assert.equal((await save(1, [q.options[0]!.id])).status, 409);
    const read = await api
      .get('/api/v1/attempts/' + id)
      .set('Authorization', 'Bearer alice');
    assert.deepEqual(read.body.data.answers[0].selectedOptionIds, [q.options[1]!.id]);
    for (const response of [first, second, read])
      for (const hidden of [
        'isCorrect',
        'correctOptionIds',
        'acceptedAnswers',
        'explanation',
      ])
        assert.ok(!JSON.stringify(response.body).includes(hidden));
    assert.equal(
      (await db.quizAttemptAnswer.findFirstOrThrow({ where: { attemptId: id } }))
        .isCorrect,
      null,
    );
    const cleared = await save(2, []);
    assert.equal(cleared.body.data.answers[0].revision, 3);
    assert.deepEqual(cleared.body.data.answers[0].selectedOptionIds, []);
  });
});
