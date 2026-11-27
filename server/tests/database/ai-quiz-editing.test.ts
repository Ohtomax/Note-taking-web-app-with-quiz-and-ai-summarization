import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P4-T22 edits publish a new key while old attempt snapshots remain unchanged', async () => {
  const settings = quizSettingsSchema.parse({
    title: 'Protocols',
    questionCount: 1,
    difficulty: 'EASY',
    questionTypes: ['MULTIPLE_CHOICE'],
    defaultMode: 'EXAM',
    includeExplanations: false,
  });
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return validQuiz(settings, data.allowedSourceKeys);
  });
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP UDP' },
    });
    const genInput = { operation: 'QUIZ', source: { scope: 'PROJECT' }, settings };
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send(genInput);
    const saved = await api
      .post('/api/v1/projects/' + project.id + '/quizzes')
      .set('Authorization', 'Bearer alice')
      .send({ generationId: gen.body.data.id });
    const first = saved.body.data;
    const question = await db.quizQuestion.findFirstOrThrow({
      where: { versionId: first.id },
      include: { options: true },
    });
    const correct = question.options.find((option) => option.isCorrect)!;
    const attempt = await db.quizAttempt.create({
      data: {
        versionId: first.id,
        requestKey: randomUUID(),
        mode: 'EXAM',
        status: 'COMPLETED',
        totalQuestions: 1,
        correctCount: 1,
        answers: {
          create: {
            questionId: question.id,
            selectedOptionIds: [correct.id],
            isCorrect: true,
          },
        },
      },
      include: { answers: true },
    });
    const content = validQuiz(settings, [first.sources[0].sourceKey]);
    const choice = content.questions[0]!;
    if (choice.type === 'IDENTIFICATION') throw new Error('Fixture type');
    choice.correctOptionIds = ['b'];
    const url = '/api/v1/quizzes/' + first.quizId;
    const published = await api
      .post(url + '/versions')
      .set('Authorization', 'Bearer alice')
      .send({ expectedVersion: 1, settings, content });
    assert.equal(published.status, 201);
    assert.equal(published.body.data.version, 2);
    assert.equal(client.calls.length, 1);
    assert.equal(
      published.body.data.questions[0].options.find(
        (o: { isCorrect: boolean }) => o.isCorrect,
      ).text,
      'UDP',
    );
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
        include: { answers: true },
      }),
      attempt,
    );
    const old = await api
      .get(url + '/versions/' + first.id + '/authoring')
      .set('Authorization', 'Bearer alice');
    assert.equal(
      old.body.data.questions[0].options.find((o: { isCorrect: boolean }) => o.isCorrect)
        .text,
      'TCP',
    );
    assert.equal(
      (
        await api
          .post(url + '/versions')
          .set('Authorization', 'Bearer alice')
          .send({ expectedVersion: 1, settings, content })
      ).status,
      409,
    );
    const regenerated = await api
      .post(url + '/regenerate')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send(genInput);
    assert.equal(regenerated.body.data.status, 'SUCCEEDED');
    const accept = { expectedVersion: 2, generationId: regenerated.body.data.id };
    const accepted = await api
      .post(url + '/versions')
      .set('Authorization', 'Bearer alice')
      .send(accept);
    assert.equal(accepted.body.data.version, 3);
    assert.equal(
      (
        await api
          .post(url + '/versions')
          .set('Authorization', 'Bearer alice')
          .send(accept)
      ).body.data.id,
      accepted.body.data.id,
    );
    assert.equal(client.calls.length, 2);
  }, client);
});
