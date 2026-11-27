import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P4-T20 malformed complete quizzes never become completed results or persisted questions', async () => {
  let variant = 0;
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    const q = {
      type: 'IDENTIFICATION',
      prompt: 'Name transport protocol',
      acceptedAnswers: ['TCP'],
      explanation: null,
      sourceKeys: data.allowedSourceKeys,
    };
    return variant === 0
      ? 'malformed JSON'
      : variant === 1
        ? { title: 'Protocols', questions: [q, q] }
        : variant === 2
          ? { title: 'Protocols', questions: [{ ...q, sourceKeys: ['invented'] }] }
          : {
              title: 'Protocols',
              questions: [{ ...q, explanation: 'Unexpected answer' }],
            };
  });
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP' },
    });
    const input = {
      operation: 'QUIZ',
      source: { scope: 'PROJECT' },
      settings: {
        title: 'Protocols',
        questionCount: 1,
        difficulty: 'EASY',
        questionTypes: ['IDENTIFICATION'],
        defaultMode: 'EXAM',
        includeExplanations: false,
      },
    };
    for (variant = 0; variant < 4; variant++) {
      const response = await api
        .post('/api/v1/projects/' + project.id + '/generations')
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', randomUUID())
        .send(input);
      assert.equal(response.body.data.status, 'FAILED');
      assert.equal(response.body.data.result, null);
    }
    assert.equal(client.calls.length, 4);
    assert.equal(await db.quizQuestion.count(), 0);
    assert.equal(await db.quizVersion.count(), 0);
  }, client);
});
