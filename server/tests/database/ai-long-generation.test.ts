import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import supertest from 'supertest';
import { setTimeout as delay } from 'node:timers/promises';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient, type AIClient } from '../../src/ai/client.ts';
import { generationLimits } from '../../src/ai/chunking/plan.ts';
test('P4-T25 times the largest local request and recovers a lost connection without duplicate calls', async (context) => {
  let interrupt = false,
    held = false,
    release!: () => void,
    started!: () => void;
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    entered = new Promise<void>((resolve) => {
      started = resolve;
    });
  const base = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as {
      stage: string;
      allowedSourceKeys: string[];
    };
    return data.stage === 'FINAL'
      ? {
          title: 'Large study guide',
          sections: [
            {
              heading: 'Coverage',
              text: 'All input chunks were processed.',
              sourceKeys: data.allowedSourceKeys,
            },
          ],
        }
      : {
          sections: [
            {
              text: 'Grounded concepts from this complete chunk.',
              sourceKeys: data.allowedSourceKeys,
            },
          ],
        };
  });
  const client: AIClient = {
    provider: base.provider,
    model: base.model,
    generate: async (request) => {
      if (interrupt && !held) {
        held = true;
        started();
        await gate;
      }
      await delay(1);
      return base.generate(request);
    },
  };
  await withWorkspace(async ({ db, project, alice, app }) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    context.after(
      () =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    );
    const api = supertest(server);
    await db.note.createMany({
      data: Array.from({ length: 200 }, (_, i) => ({
        projectId: project.id,
        title: 'Note ' + i,
        plainText: ('Concept ' + i).padEnd(500, 'x'),
      })),
    });
    const input = {
      operation: 'SUMMARY',
      source: { scope: 'PROJECT' },
      settings: { length: 'DETAILED', format: 'STUDY_GUIDE' },
    };
    const url = '/api/v1/projects/' + project.id + '/generations';
    const post = (key: string) =>
      api
        .post(url)
        .set('Authorization', 'Bearer alice')
        .set('Idempotency-Key', key)
        .send(input);
    const began = performance.now();
    const full = await post(randomUUID());
    const elapsed = performance.now() - began;
    assert.equal(full.body.data.status, 'SUCCEEDED');
    assert.equal(full.body.data.result.sources.length, 200);
    const calls = base.calls.length;
    assert.ok(calls <= generationLimits.maxCalls);
    assert.ok(elapsed < generationLimits.deadlineMs);
    context.diagnostic(
      'LOCAL_MOCK_LARGEST_FOLDER elapsed_ms=' +
        Math.round(elapsed) +
        ' calls=' +
        calls +
        ' notes=200 source_bytes=100000',
    );
    interrupt = true;
    const key = randomUUID(),
      request = post(key);
    const lost = request.then(
      () => undefined,
      () => undefined,
    );
    try {
      await entered;
      request.abort();
      const operation = await db.aIUsage.findUniqueOrThrow({
        where: { userId_requestKey: { userId: alice.id, requestKey: key } },
      });
      assert.equal(
        (
          await api
            .get('/api/v1/generations/' + operation.id)
            .set('Authorization', 'Bearer alice')
        ).body.data.status,
        'RUNNING',
      );
      release();
      let status = 'RUNNING';
      for (let tries = 0; tries < 200 && status === 'RUNNING'; tries++) {
        await delay(10);
        status = (
          await api
            .get('/api/v1/generations/' + operation.id)
            .set('Authorization', 'Bearer alice')
        ).body.data.status;
      }
      assert.equal(status, 'SUCCEEDED');
      const beforeRetry = base.calls.length;
      assert.equal((await post(key)).body.data.id, operation.id);
      assert.equal(base.calls.length, beforeRetry);
      assert.equal(
        await db.aICall.count({ where: { usageId: operation.id } }),
        beforeRetry - calls,
      );
      const ledger = await db.aIUsage.findUniqueOrThrow({ where: { id: operation.id } });
      assert.equal(ledger.accountedTokens, (beforeRetry - calls) * 140);
    } finally {
      release();
      await lost;
    }
  }, client);
});
