import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { seedStudyQuiz } from './study.fixture.ts';
import { validQuiz } from '../fixtures/ai.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P6-T06 every fixed key grades identically in both modes and survives duplicate finish, editing and retake', async () => {
  const client = createMockAIClient(() => {
    throw Error('Attempts cannot invoke AI');
  });
  await withWorkspace(async ({ db, api, project }) => {
    const { quiz, version, settings } = await seedStudyQuiz(db, project.id),
      startPath = '/api/v1/quizzes/' + quiz.id + '/attempts';
    const results = [];
    for (const mode of ['PRACTICE', 'EXAM'] as const) {
      const started = await api
        .post(startPath)
        .auth('alice', { type: 'bearer' })
        .set('Idempotency-Key', randomUUID())
        .send({
          versionId: version.id,
          mode,
          shuffleQuestions: true,
          shuffleOptions: true,
        });
      assert.equal(started.status, 201);
      const path = '/api/v1/attempts/' + started.body.data.id;
      for (const [index, question] of version.questions.entries()) {
        const input =
          question.type === 'IDENTIFICATION'
            ? { text: '  ＴＣＰ  ' }
            : { optionIds: question.options.filter((o) => o.isCorrect).map((o) => o.id) };
        const answered = await api
          .put(path + '/answers/' + question.id)
          .auth('alice', { type: 'bearer' })
          .send(input);
        assert.equal(answered.status, 200);
        const reloaded = await api.get(path).auth('alice', { type: 'bearer' });
        assert.deepEqual(
          reloaded.body.data.questionOrder,
          started.body.data.questionOrder,
        );
        assert.deepEqual(reloaded.body.data.optionOrder, started.body.data.optionOrder);
        const questions = reloaded.body.data.questions as Array<{
          feedback?: unknown;
          options: Array<{ isCorrect?: boolean }>;
        }>;
        assert.equal(
          questions.filter((q) => q.feedback !== undefined).length,
          mode === 'PRACTICE' ? index + 1 : 0,
        );
        assert.ok(
          questions.every((q) => q.options.every((o) => o.isCorrect === undefined)),
        );
      }
      const finish = () =>
        api
          .post(path + '/submit')
          .auth('alice', { type: 'bearer' })
          .send({});
      const [a, b] = await Promise.all([finish(), finish()]);
      assert.equal(a.status, 200);
      assert.deepEqual(a.body.data, b.body.data);
      assert.equal(a.body.data.result.percentage, 100);
      assert.equal(a.body.data.result.correctCount, 4);
      const review = await api.get(path + '/results').auth('alice', { type: 'bearer' });
      results.push({ id: started.body.data.id as string, review: review.body.data });
      assert.equal(
        (
          await api
            .put(path + '/answers/' + version.questions[0]!.id)
            .auth('alice', { type: 'bearer' })
            .send({ optionIds: [version.questions[0]!.options[0]!.id] })
        ).status,
        409,
      );
    }
    const changed = validQuiz(settings, ['source']);
    const first = changed.questions[0]!;
    if (first.type === 'IDENTIFICATION') throw Error('Expected MC fixture');
    first.correctOptionIds = ['b'];
    assert.equal(
      (
        await api
          .post('/api/v1/quizzes/' + quiz.id + '/versions')
          .auth('alice', { type: 'bearer' })
          .send({ expectedVersion: 1, settings, content: changed })
      ).status,
      201,
    );
    for (const result of results)
      assert.deepEqual(
        (
          await api
            .get('/api/v1/attempts/' + result.id + '/results')
            .auth('alice', { type: 'bearer' })
        ).body.data,
        result.review,
      );
    const key = randomUUID(),
      retake = () =>
        api
          .post(startPath)
          .auth('alice', { type: 'bearer' })
          .set('Idempotency-Key', key)
          .send({
            versionId: version.id,
            mode: 'EXAM',
            shuffleQuestions: true,
            shuffleOptions: true,
          });
    const [a, b] = await Promise.all([retake(), retake()]);
    assert.equal(a.status, 201);
    assert.equal(a.body.data.id, b.body.data.id);
    assert.equal(a.body.data.version, 1);
    assert.equal(a.body.data.answers.length, 0);
    const read = await api
      .get('/api/v1/attempts/' + a.body.data.id)
      .auth('alice', { type: 'bearer' });
    assert.deepEqual(read.body.data.questionOrder, a.body.data.questionOrder);
    assert.deepEqual(read.body.data.optionOrder, a.body.data.optionOrder);
    assert.equal(await db.quizAttempt.count({ where: { versionId: version.id } }), 3);
    assert.equal(
      (
        await api
          .get('/api/v1/attempts?quizId=' + quiz.id)
          .auth('alice', { type: 'bearer' })
      ).body.total,
      3,
    );
    assert.equal(client.calls.length, 0);
  }, client);
});
