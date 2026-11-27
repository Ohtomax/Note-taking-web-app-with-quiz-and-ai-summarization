import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P4-T23 quiz library copies independently and soft deletion preserves attempt versions', async () => {
  const settings = quizSettingsSchema.parse({
    title: 'Protocols',
    questionCount: 1,
    difficulty: 'EASY',
    questionTypes: ['IDENTIFICATION'],
    defaultMode: 'PRACTICE',
    includeExplanations: false,
  });
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return validQuiz(settings, data.allowedSourceKeys);
  });
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP' },
    });
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ operation: 'QUIZ', source: { scope: 'PROJECT' }, settings });
    const saved = await api
      .post('/api/v1/projects/' + project.id + '/quizzes')
      .set('Authorization', 'Bearer alice')
      .send({ generationId: gen.body.data.id });
    const first = saved.body.data,
      url = '/api/v1/quizzes/' + first.quizId;
    const attempt = await db.quizAttempt.create({
      data: {
        versionId: first.id,
        requestKey: randomUUID(),
        mode: 'PRACTICE',
        status: 'COMPLETED',
        totalQuestions: 1,
        correctCount: 1,
      },
    });
    const copy = await api
      .post(url + '/duplicate')
      .set('Authorization', 'Bearer alice')
      .send({ expectedVersion: 1 });
    assert.equal(copy.status, 201);
    assert.notEqual(copy.body.data.id, first.quizId);
    assert.notEqual(copy.body.data.versions[0].questions[0].id, first.questions[0].id);
    const copyUrl = '/api/v1/quizzes/' + copy.body.data.id;
    assert.equal(
      (
        await api
          .patch(copyUrl)
          .set('Authorization', 'Bearer alice')
          .send({ title: 'Independent' })
      ).status,
      200,
    );
    assert.equal(
      (await api.get(url + '/versions').set('Authorization', 'Bearer alice')).body.total,
      1,
    );
    for (const call of [
      () => api.get(url),
      () => api.get(url + '/versions'),
      () => api.patch(url).send({ title: 'Foreign' }),
      () => api.post(url + '/duplicate').send({ expectedVersion: 1 }),
      () => api.delete(url).send({ confirmed: true }),
    ])
      assert.equal((await call().set('Authorization', 'Bearer bob')).status, 404);
    assert.equal(
      (
        await api
          .delete(url)
          .set('Authorization', 'Bearer alice')
          .send({ confirmed: true })
      ).status,
      204,
    );
    const list = await api
      .get('/api/v1/projects/' + project.id + '/quizzes')
      .set('Authorization', 'Bearer alice');
    assert.equal(list.body.total, 1);
    assert.equal(list.body.data[0].title, 'Independent');
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
      attempt,
    );
    assert.equal(
      (await db.quizVersion.findUniqueOrThrow({ where: { id: first.id } })).version,
      1,
    );
    assert.equal(client.calls.length, 1);
  }, client);
});
