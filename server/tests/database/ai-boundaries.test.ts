import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient, type AIClient } from '../../src/ai/client.ts';
import {
  quotaPolicy,
  createAIAdmissionRepository,
} from '../../src/repositories/ai-admission.repository.ts';
import { createAIUsageRepository } from '../../src/repositories/ai-usage.repository.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
import { generationLimits } from '../../src/ai/chunking/plan.ts';
const summarySettings = { length: 'SHORT', format: 'PARAGRAPHS' };
const quizSettings = quizSettingsSchema.parse({
  title: 'Boundary',
  questionCount: 4,
  difficulty: 'MEDIUM',
  questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'IDENTIFICATION'],
  defaultMode: 'EXAM',
  includeExplanations: true,
});
const makeClient = () =>
  createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as {
      operation: string;
      stage: string;
      settings: unknown;
      allowedSourceKeys: string[];
    };
    if (data.stage !== 'FINAL')
      return {
        sections: data.allowedSourceKeys.map((key) => ({
          text: 'Grounded concept',
          sourceKeys: [key],
        })),
      };
    return data.operation === 'QUIZ'
      ? validQuiz(quizSettingsSchema.parse(data.settings), data.allowedSourceKeys)
      : {
          title: 'Grounded summary',
          sections: [
            {
              heading: null,
              text: 'Grounded study material',
              sourceKeys: data.allowedSourceKeys,
            },
          ],
        };
  });
test('P4-T24 every generation and artifact boundary rejects foreign identities without writes or calls', async () => {
  const client = makeClient();
  await withWorkspace(
    async ({ db, project, foreign, api, alice, bob }) => {
      const records = [];
      for (const [parent, token] of [
        [project, 'alice'],
        [foreign, 'bob'],
      ] as const) {
        const note = await db.note.create({
          data: { projectId: parent.id, title: 'Protocol', plainText: 'TCP UDP IP' },
        });
        const generate = async (operation: 'SUMMARY' | 'QUIZ') => {
          const response = await api
            .post('/api/v1/projects/' + parent.id + '/generations')
            .set('Authorization', 'Bearer ' + token)
            .set('Idempotency-Key', randomUUID())
            .send({
              operation,
              source: { scope: 'PROJECT' },
              settings: operation === 'SUMMARY' ? summarySettings : quizSettings,
            });
          assert.equal(response.body.data.status, 'SUCCEEDED');
          return response.body.data.id as string;
        };
        const summaryGen = await generate('SUMMARY'),
          quizGen = await generate('QUIZ');
        const summary = await api
          .post('/api/v1/projects/' + parent.id + '/summaries')
          .set('Authorization', 'Bearer ' + token)
          .send({ generationId: summaryGen });
        const quiz = await api
          .post('/api/v1/projects/' + parent.id + '/quizzes')
          .set('Authorization', 'Bearer ' + token)
          .send({ generationId: quizGen });
        assert.equal(summary.status, 201);
        assert.equal(quiz.status, 201);
        records.push({
          parent,
          note,
          summary: summary.body.data,
          version: quiz.body.data,
          summaryGen,
          quizGen,
        });
      }
      const owners = { in: [alice.id, bob.id] };
      const snapshot = async () =>
        JSON.stringify({
          summaries: await db.summary.findMany({
            where: { project: { ownerId: owners } },
            orderBy: { id: 'asc' },
            include: { sources: { orderBy: { id: 'asc' } } },
          }),
          quizzes: await db.quiz.findMany({
            where: { project: { ownerId: owners } },
            orderBy: { id: 'asc' },
            include: {
              versions: {
                orderBy: { id: 'asc' },
                include: {
                  sources: { orderBy: { id: 'asc' } },
                  questions: {
                    orderBy: { id: 'asc' },
                    include: { options: { orderBy: { id: 'asc' } } },
                  },
                },
              },
            },
          }),
          usage: await db.aIUsage.findMany({
            where: { userId: owners },
            orderBy: { id: 'asc' },
            include: { calls: { orderBy: { id: 'asc' } } },
          }),
        });
      const before = await snapshot();
      for (const [target, token, ownProject] of [
        [records[1]!, 'alice', project],
        [records[0]!, 'bob', foreign],
      ] as const) {
        const base = '/api/v1/projects/' + target.parent.id,
          summary = '/api/v1/summaries/' + target.summary.id,
          quiz = '/api/v1/quizzes/' + target.version.quizId;
        const generationInput = {
          operation: 'QUIZ',
          source: { scope: 'PROJECT' },
          settings: quizSettings,
        };
        const cases: Array<{
          method: 'get' | 'post' | 'patch' | 'delete';
          path: string;
          body?: unknown;
        }> = [
          { method: 'get', path: base + '/summaries' },
          { method: 'get', path: base + '/quizzes' },
          { method: 'get', path: summary },
          { method: 'patch', path: summary, body: { title: 'Forbidden' } },
          { method: 'delete', path: summary, body: { confirmed: true } },
          {
            method: 'post',
            path: summary + '/regenerate',
            body: {
              operation: 'SUMMARY',
              source: { scope: 'PROJECT' },
              settings: summarySettings,
            },
          },
          { method: 'get', path: quiz },
          { method: 'get', path: quiz + '/versions' },
          { method: 'get', path: quiz + '/versions/' + target.version.id + '/authoring' },
          { method: 'patch', path: quiz, body: { title: 'Forbidden' } },
          { method: 'delete', path: quiz, body: { confirmed: true } },
          { method: 'post', path: quiz + '/duplicate', body: { expectedVersion: 1 } },
          {
            method: 'post',
            path: quiz + '/versions',
            body: {
              expectedVersion: 1,
              settings: quizSettings,
              content: validQuiz(quizSettings, [target.version.sources[0].sourceKey]),
            },
          },
          { method: 'post', path: quiz + '/regenerate', body: generationInput },
          { method: 'get', path: '/api/v1/generations/' + target.quizGen },
          { method: 'post', path: base + '/generations', body: generationInput },
          {
            method: 'post',
            path: '/api/v1/projects/' + ownProject.id + '/summaries',
            body: { generationId: target.summaryGen },
          },
          {
            method: 'post',
            path: '/api/v1/projects/' + ownProject.id + '/quizzes',
            body: { generationId: target.quizGen },
          },
          {
            method: 'post',
            path: '/api/v1/projects/' + ownProject.id + '/generations',
            body: {
              ...generationInput,
              source: { scope: 'NOTES', noteIds: [target.note.id] },
            },
          },
        ];
        for (const item of cases) {
          let call = api[item.method](item.path)
            .set('Authorization', 'Bearer ' + token)
            .set('Idempotency-Key', randomUUID());
          if (item.body) call = call.send(item.body);
          assert.equal((await call).status, 404, item.method + ' ' + item.path);
          assert.equal(
            await snapshot(),
            before,
            'Rejected operation changed artifacts or usage',
          );
        }
      }
      assert.equal(client.calls.length, 4);
      const usage = await api
        .get('/api/v1/ai-usage')
        .set('Authorization', 'Bearer alice');
      assert.equal(usage.body.total, 2);
      assert.equal(usage.body.quota.requestsUsed, 2);
      assert.equal(usage.body.quota.accountedTokens, 280);
    },
    client,
    { pricing: { version: 'fixture-v1', input: 1, output: 2 } },
  );
});
test('P4-T24 HTTP quota and global concurrency rejections incur no provider call; in-flight duplicates share status', async () => {
  const base = makeClient();
  let release!: () => void, notifyStart!: () => void;
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    started = new Promise<void>((resolve) => {
      notifyStart = resolve;
    });
  const client: AIClient = {
    provider: base.provider,
    model: base.model,
    generate: async (request) => {
      notifyStart();
      await gate;
      return base.generate(request);
    },
  };
  await withWorkspace(
    async ({ db, project, foreign, api }) => {
      for (const parent of [project, foreign])
        await db.note.create({
          data: { projectId: parent.id, title: 'TCP', plainText: 'TCP' },
        });
      const key = randomUUID(),
        body = {
          operation: 'SUMMARY',
          source: { scope: 'PROJECT' },
          settings: summarySettings,
        };
      const post = (parent: string, token: string, requestKey: string) =>
        api
          .post('/api/v1/projects/' + parent + '/generations')
          .set('Authorization', 'Bearer ' + token)
          .set('Idempotency-Key', requestKey)
          .send(body);
      const first = post(project.id, 'alice', key).then((response) => response);
      try {
        await started;
        assert.equal((await post(project.id, 'alice', randomUUID())).status, 429);
        assert.equal((await post(foreign.id, 'bob', randomUUID())).status, 429);
        const duplicate = await post(project.id, 'alice', key);
        assert.equal(duplicate.body.data.status, 'RUNNING');
        release();
        const complete = await first;
        assert.equal(complete.body.data.id, duplicate.body.data.id);
        assert.equal(complete.body.data.status, 'SUCCEEDED');
        assert.equal(base.calls.length, 1);
        assert.equal(
          (await post(project.id, 'alice', randomUUID())).body.error.code,
          'AI_QUOTA',
        );
        assert.equal(base.calls.length, 1);
      } finally {
        release();
        await first;
      }
    },
    client,
    {
      quota: {
        ...quotaPolicy,
        globalConcurrency: 1,
        dailyUserTokens:
          (generationLimits.chunkTokens +
            generationLimits.outputTokens +
            generationLimits.promptReserve) *
          (generationLimits.retries + 1),
      },
    },
  );
});
test('P4-T24 expired running reservations stay uncertain even when the next quota admission fails', async () => {
  await withWorkspace(async ({ db, alice }) => {
    const row = await db.aIUsage.create({
      data: {
        userId: alice.id,
        requestKey: randomUUID(),
        inputHash: 'x'.repeat(64),
        operation: 'SUMMARY',
        provider: 'mock',
        model: 'm',
        status: 'RUNNING',
        reservedTokens: 99,
        accountedTokens: 99,
        leaseExpiresAt: new Date(0),
      },
    });
    const admission = createAIAdmissionRepository(db, {
      ...quotaPolicy,
      dailyUserTokens: 150,
    });
    await assert.rejects(
      admission.reserve({
        userId: alice.id,
        requestKey: randomUUID(),
        inputHash: 'y'.repeat(64),
        operation: 'SUMMARY',
        provider: 'mock',
        model: 'm',
        reservedTokens: 80,
        leaseExpiresAt: new Date(Date.now() + 60000),
      }),
      /allowance/,
    );
    const expired = await db.aIUsage.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(expired.status, 'UNCERTAIN');
    assert.equal(expired.accountedTokens, 99);
    await assert.rejects(
      createAIUsageRepository(db).recordCall(alice.id, row.id, {
        number: 2,
        status: 'RUNNING',
        usage: { inputTokens: null, outputTokens: null },
      }),
      /no longer active/,
    );
  });
});
test('P4-T24 the advertised fifty-question boundary generates and saves a valid full quiz', async () => {
  const client = makeClient();
  await withWorkspace(async ({ db, project, api }) => {
    await db.note.create({
      data: { projectId: project.id, title: 'TCP', plainText: 'TCP UDP IP' },
    });
    const settings = { ...quizSettings, questionCount: 50 };
    const generated = await api
      .post('/api/v1/projects/' + project.id + '/generations')
      .set('Authorization', 'Bearer alice')
      .set('Idempotency-Key', randomUUID())
      .send({ operation: 'QUIZ', source: { scope: 'PROJECT' }, settings });
    assert.equal(generated.body.data.status, 'SUCCEEDED');
    const saved = await api
      .post('/api/v1/projects/' + project.id + '/quizzes')
      .set('Authorization', 'Bearer alice')
      .send({ generationId: generated.body.data.id });
    assert.equal(saved.status, 201);
    assert.equal(saved.body.data.questions.length, 50);
    assert.equal(client.calls.length, 1);
  }, client);
});
