import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P5-T05 saves edited quiz previews while keeping generated drafts and earlier versions fixed', async () => {
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
    const note = await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP UDP' },
    });
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ operation: 'QUIZ', source: { scope: 'PROJECT' }, settings });
    const draft = gen.body.data.result.output;
    draft.questions[0].correctOptionIds = ['b'];
    draft.questions[0].prompt = 'Edited transport question';
    const accepted = await api
      .post('/api/v1/projects/' + project.id + '/quizzes')
      .set('Authorization', 'Bearer alice')
      .send({ generationId: gen.body.data.id, settings, content: draft });
    assert.equal(accepted.status, 201);
    const first = accepted.body.data;
    assert.equal(
      first.questions[0].options.find(
        (option: { isCorrect: boolean }) => option.isCorrect,
      ).text,
      'UDP',
    );
    draft.questions[0].correctOptionIds = ['a'];
    const next = await api
      .post('/api/v1/quizzes/' + first.quizId + '/versions')
      .set('Authorization', 'Bearer alice')
      .send({ expectedVersion: 1, settings, content: draft });
    assert.equal(next.status, 201);
    assert.equal(next.body.data.version, 2);
    const old = await api
      .get('/api/v1/quizzes/' + first.quizId + '/versions/' + first.id + '/authoring')
      .set('Authorization', 'Bearer alice');
    assert.equal(
      old.body.data.questions[0].options.find(
        (option: { isCorrect: boolean }) => option.isCorrect,
      ).text,
      'UDP',
    );
    assert.deepEqual(await db.note.findUniqueOrThrow({ where: { id: note.id } }), note);
    assert.equal(client.calls.length, 1);
    const regenerated = await api
      .post('/api/v1/quizzes/' + first.quizId + '/regenerate')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ operation: 'QUIZ', source: { scope: 'PROJECT' }, settings });
    const accept = {
      expectedVersion: 2,
      generationId: regenerated.body.data.id,
      settings,
      content: {
        ...draft,
        questions: [{ ...draft.questions[0], correctOptionIds: ['b'] }],
      },
    };
    const third = await api
      .post('/api/v1/quizzes/' + first.quizId + '/versions')
      .set('Authorization', 'Bearer alice')
      .send(accept);
    assert.equal(third.status, 201);
    assert.equal(third.body.data.version, 3);
    assert.equal(
      third.body.data.questions[0].options.find(
        (option: { isCorrect: boolean }) => option.isCorrect,
      ).text,
      'UDP',
    );
    assert.equal(
      (
        await api
          .post('/api/v1/quizzes/' + first.quizId + '/versions')
          .set('Authorization', 'Bearer alice')
          .send(accept)
      ).body.data.id,
      third.body.data.id,
    );
    assert.equal(client.calls.length, 2);
  }, client);
});
