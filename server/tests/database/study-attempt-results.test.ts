import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P5-T15 results keep attempted wording/key and distinguish unanswered questions after a quiz edit', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version, settings } = await seedStudyQuiz(db, project.id);
    const start = await api
      .post('/api/v1/quizzes/' + quiz.id + '/attempts')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    const id = start.body.data.id,
      q = version.questions[0]!,
      url = '/api/v1/attempts/' + id;
    assert.equal(
      (await api.get(url + '/results').set('Authorization', 'Bearer alice')).status,
      409,
    );
    await api
      .put(url + '/answers/' + q.id)
      .set('Authorization', 'Bearer alice')
      .send({ optionIds: [q.options.find((option) => option.isCorrect)!.id] });
    await api
      .post(url + '/submit')
      .set('Authorization', 'Bearer alice')
      .send({});
    const before = await api.get(url + '/results').set('Authorization', 'Bearer alice');
    assert.equal(before.body.data.result.percentage, 25);
    assert.equal(before.body.data.result.correctCount, 1);
    assert.equal(before.body.data.result.unansweredCount, 3);
    assert.equal(before.body.data.result.incorrectCount, 0);
    const edited = validQuiz(settings, ['source']);
    edited.questions[0]!.prompt = 'Changed author wording';
    const first = edited.questions[0]!;
    if (first.type === 'IDENTIFICATION') throw new Error('Fixture');
    first.correctOptionIds = ['b'];
    assert.equal(
      (
        await api
          .post('/api/v1/quizzes/' + quiz.id + '/versions')
          .set('Authorization', 'Bearer alice')
          .send({ expectedVersion: 1, settings, content: edited })
      ).status,
      201,
    );
    const after = await api.get(url + '/results').set('Authorization', 'Bearer alice');
    assert.deepEqual(after.body.data, before.body.data);
    assert.equal(after.body.data.questions[0].prompt, q.prompt);
    assert.equal(
      (await api.get(url + '/results').set('Authorization', 'Bearer bob')).status,
      404,
    );
  });
});
