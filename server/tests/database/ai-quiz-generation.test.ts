import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
test('P4-T19 quizzes support all source scopes and reject stale/foreign selections before calls', async () => {
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as { allowedSourceKeys: string[] };
    return {
      title: 'Protocols',
      questions: [
        {
          type: 'IDENTIFICATION',
          prompt: 'Which protocol?',
          acceptedAnswers: ['TCP'],
          explanation: null,
          sourceKeys: data.allowedSourceKeys,
        },
      ],
    };
  });
  await withWorkspace(async ({ db, project, api }) => {
    const note = await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP reliable transport' },
    });
    const url = '/api/v1/projects/' + project.id + '/generations',
      settings = {
        title: 'Protocols',
        questionCount: 1,
        difficulty: 'EASY',
        questionTypes: ['IDENTIFICATION'],
        defaultMode: 'EXAM',
        includeExplanations: false,
      };
    const post = (source: unknown, token = 'alice') =>
      api
        .post(url)
        .set('Authorization', 'Bearer ' + token)
        .set('Idempotency-Key', randomUUID())
        .send({ operation: 'QUIZ', source, settings });
    for (const source of [
      { scope: 'NOTE', noteId: note.id, revision: 1 },
      { scope: 'EXCERPT', noteId: note.id, revision: 1, start: 0, end: 3 },
      { scope: 'NOTES', noteIds: [note.id] },
      { scope: 'PROJECT' },
    ]) {
      const response = await post(source);
      assert.equal(response.status, 201);
      assert.equal(response.body.data.status, 'SUCCEEDED');
      assert.equal(response.body.data.result.output.questions.length, 1);
    }
    assert.equal(client.calls.length, 4);
    assert.equal(
      (await post({ scope: 'NOTE', noteId: note.id, revision: 99 })).status,
      409,
    );
    assert.equal((await post({ scope: 'PROJECT' }, 'bob')).status, 404);
    assert.equal(client.calls.length, 4);
  }, client);
});
