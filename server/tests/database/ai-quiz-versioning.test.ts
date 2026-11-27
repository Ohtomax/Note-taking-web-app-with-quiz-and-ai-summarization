import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { storedGenerationSchema } from '../../src/utils/input-validators/generations.ts';
import { jsonValue } from '../../src/repositories/ai-generation.repository.ts';
import { validQuiz } from '../fixtures/ai.ts';
test('P4-T21 complete immutable quiz version saves atomically and authoring requires ownership', async () => {
  const settings = quizSettingsSchema.parse({
    title: 'Mixed',
    questionCount: 4,
    difficulty: 'HARD',
    questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'IDENTIFICATION'],
    defaultMode: 'EXAM',
    includeExplanations: true,
  });
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return validQuiz(settings, data.allowedSourceKeys);
  });
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP UDP IP' },
    });
    const gen = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ operation: 'QUIZ', source: { scope: 'PROJECT' }, settings });
    assert.equal(gen.body.data.status, 'SUCCEEDED');
    const usage = await db.aIUsage.findUniqueOrThrow({ where: { id: gen.body.data.id } });
    const corrupt = storedGenerationSchema.parse(usage.result);
    corrupt.manifest.sources.push(corrupt.manifest.sources[0]!);
    await db.aIUsage.update({
      where: { id: usage.id },
      data: { result: jsonValue(corrupt) },
    });
    const save = () =>
      api
        .post('/api/v1/projects/' + project.id + '/quizzes')
        .set('Authorization', 'Bearer alice')
        .send({ generationId: usage.id });
    assert.equal((await save()).status, 500);
    assert.equal(await db.quiz.count({ where: { projectId: project.id } }), 0);
    assert.equal(await db.quizVersion.count(), 0);
    assert.equal(await db.quizQuestion.count(), 0);
    await db.aIUsage.update({
      where: { id: usage.id },
      data: { result: jsonValue(usage.result) },
    });
    const saved = await save();
    assert.equal(saved.status, 201);
    const version = saved.body.data;
    assert.equal(version.questions.length, 4);
    assert.equal(version.version, 1);
    const url =
      '/api/v1/quizzes/' + version.quizId + '/versions/' + version.id + '/authoring';
    assert.equal((await api.get(url).set('Authorization', 'Bearer alice')).status, 200);
    assert.equal((await api.get(url).set('Authorization', 'Bearer bob')).status, 404);
    assert.equal((await save()).body.data.id, version.id);
    assert.equal(client.calls.length, 1);
  }, client);
});
