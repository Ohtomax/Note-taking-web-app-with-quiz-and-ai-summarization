import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
test('P5-T08 exam player payloads never disclose keys and practice only reveals committed questions', async () => {
  await withWorkspace(async ({ db, project, api }) => {
    const { quiz, version } = await seedStudyQuiz(db, project.id);
    await api
      .get('/api/v1/quizzes/' + quiz.id + '/versions/' + version.id + '/authoring')
      .set('Authorization', 'Bearer alice');
    for (const mode of ['EXAM', 'PRACTICE']) {
      const started = await api
        .post('/api/v1/quizzes/' + quiz.id + '/attempts')
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', randomUUID())
        .send({ versionId: version.id, mode });
      const id = started.body.data.id,
        url = '/api/v1/attempts/' + id;
      assert.equal(started.body.data.questions.length, 4);
      assert.ok(!JSON.stringify(started.body).includes('isCorrect'));
      assert.ok(!JSON.stringify(started.body).includes('acceptedAnswers'));
      assert.ok(!JSON.stringify(started.body).includes('explanation'));
      const question = version.questions[0]!;
      await db.quizAttemptAnswer.create({
        data: {
          attemptId: id,
          versionId: version.id,
          questionId: question.id,
          selectedOptionIds: [question.options.find((option) => option.isCorrect)!.id],
          isCorrect: true,
        },
      });
      const resumed = await api.get(url).set('Authorization', 'Bearer alice');
      assert.equal(resumed.status, 200);
      if (mode === 'EXAM') {
        assert.ok(!JSON.stringify(resumed.body).includes('isCorrect'));
        assert.ok(!JSON.stringify(resumed.body).includes('explanation'));
      } else {
        assert.equal(resumed.body.data.questions[0].feedback.isCorrect, true);
        assert.ok(
          resumed.body.data.questions
            .slice(1)
            .every((q: { feedback?: unknown }) => !q.feedback),
        );
      }
      assert.equal((await api.get(url).set('Authorization', 'Bearer bob')).status, 404);
    }
  });
});
