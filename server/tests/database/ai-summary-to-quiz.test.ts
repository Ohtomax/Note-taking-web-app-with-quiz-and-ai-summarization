import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';

test('validates streamed summaries and generates quizzes only from the current owned summary', async () => {
  const quizSettings = quizSettingsSchema.parse({
    title: 'Saved facts',
    questionCount: 5,
    difficulty: 'MIXED',
    questionTypes: ['MULTIPLE_CHOICE'],
    defaultMode: 'EXAM',
    includeExplanations: true,
  });
  const client = createMockAIClient((request) => {
    const { operation, sources, allowedSourceKeys } = JSON.parse(request.prompt) as {
      operation: 'SUMMARY' | 'QUIZ';
      sources: Array<{ text: string }>;
      allowedSourceKeys: string[];
    };
    if (operation === 'QUIZ') {
      assert.match(sources[0]!.text, /Saved study text/);
      assert.doesNotMatch(sources[0]!.text, /Private note text omitted/);
      const draft = validQuiz(quizSettings, allowedSourceKeys);
      draft.questions = draft.questions.map((question) =>
        question.type === 'IDENTIFICATION'
          ? { ...question, topic: 'Transport protocols' }
          : {
              ...question,
              topic: 'Transport protocols',
              options: question.options.map((option) =>
                option.id === 'b'
                  ? {
                      ...option,
                      rationale: 'UDP lacks the reliability described in the notes.',
                    }
                  : option,
              ),
            },
      );
      return draft;
    }
    const sections = [
      { heading: 'Overview', text: 'Saved study text', sourceKeys: allowedSourceKeys },
      { heading: 'Recap', text: 'A grounded recap', sourceKeys: allowedSourceKeys },
    ];
    request.onPartial?.({
      title: 'Saved facts',
      sections: [{ ...sections[0], sourceKeys: ['unapproved-key'] }, {}],
    });
    request.onPartial?.({ title: 'Saved facts', sections: [sections[0], {}] });
    return { title: 'Saved facts', sections };
  });

  await withWorkspace(async ({ api, db, project, foreign }) => {
    await db.note.create({
      data: {
        projectId: project.id,
        title: 'Note',
        plainText: 'Private note text omitted',
      },
    });
    const generate = (projectId: string, token: string, key = randomUUID()) =>
      api
        .post('/api/v1/projects/' + projectId + '/generations')
        .auth(token, { type: 'bearer' })
        .set('Idempotency-Key', key);
    const streamed = await generate(project.id, 'alice')
      .set('Accept', 'text/event-stream')
      .buffer(true)
      .parse((res, done) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (part: string) => {
          body += part;
        });
        res.on('end', () => done(null, body));
      })
      .send({
        operation: 'SUMMARY',
        source: { scope: 'PROJECT' },
        settings: { length: 'SHORT', format: 'QUICK' },
      });

    assert.equal(streamed.status, 201);
    assert.match(streamed.headers['content-type'] ?? '', /^text\/event-stream/);
    const frames = (streamed.body as string)
      .trim()
      .split('\n\n')
      .map((frame) => JSON.parse(frame.slice('data: '.length)));
    assert.deepEqual(
      frames.map((frame) => frame.type),
      ['summary', 'result'],
    );
    assert.equal(frames[0].content.sections.length, 1);
    assert.equal(frames[1].data.status, 'SUCCEEDED');
    assert.equal(frames[1].data.result.output.sections.length, 2);
    const saved = await api
      .post('/api/v1/projects/' + project.id + '/summaries')
      .auth('alice', { type: 'bearer' })
      .send({ generationId: frames[1].data.id });
    assert.equal(saved.status, 201);

    const source = {
      scope: 'SUMMARY',
      summaryId: saved.body.data.id,
      updatedAt: saved.body.data.updatedAt,
    };
    const input = { operation: 'QUIZ', source, settings: quizSettings };
    assert.equal((await generate(foreign.id, 'bob').send(input)).status, 404);
    assert.equal((await generate(project.id, 'bob').send(input)).status, 404);
    assert.equal(
      (
        await generate(project.id, 'alice').send({
          ...input,
          source: { ...source, updatedAt: '2026-01-01T00:00:00.000Z' },
        })
      ).status,
      409,
    );
    assert.equal(client.calls.length, 1);
    const key = randomUUID();
    const first = await generate(project.id, 'alice', key).send(input);
    assert.equal(first.status, 201);
    assert.equal(first.body.data.status, 'SUCCEEDED');
    assert.equal(first.body.data.result.sources[0].noteId, null);
    assert.equal(
      first.body.data.result.sources[0].sourceKey,
      'summary:' + source.summaryId,
    );
    const quiz = await api
      .post('/api/v1/projects/' + project.id + '/quizzes')
      .auth('alice', { type: 'bearer' })
      .send({ generationId: first.body.data.id });
    assert.equal(quiz.status, 201);
    const attempt = await api
      .post('/api/v1/quizzes/' + quiz.body.data.quizId + '/attempts')
      .auth('alice', { type: 'bearer' })
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: quiz.body.data.id, mode: 'EXAM' });
    assert.equal(attempt.status, 201);
    const question = attempt.body.data.questions[0];
    assert.equal(question.topic, undefined);
    assert.ok(!JSON.stringify(attempt.body.data).includes('reliability described'));
    const attemptPath = '/api/v1/attempts/' + attempt.body.data.id;
    const recorded = await api
      .put(attemptPath + '/answers/' + question.id)
      .auth('alice', { type: 'bearer' })
      .send({ optionIds: [question.options[1].id] });
    assert.equal(recorded.status, 200);
    assert.equal(recorded.body.data.questions[0].feedback, undefined);
    const graded = await api
      .post(attemptPath + '/submit')
      .auth('alice', { type: 'bearer' })
      .send({});
    assert.equal(graded.status, 200);
    assert.equal(graded.body.data.questions[0].topic, 'Transport protocols');
    assert.deepEqual(graded.body.data.questions[0].feedback.incorrectOptions, [
      {
        optionId: question.options[1].id,
        reason: 'UDP lacks the reliability described in the notes.',
      },
    ]);
    assert.deepEqual(
      (await generate(project.id, 'alice', key).send(input)).body.data.id,
      first.body.data.id,
    );
    assert.equal(client.calls.length, 2);
  }, client);
});
