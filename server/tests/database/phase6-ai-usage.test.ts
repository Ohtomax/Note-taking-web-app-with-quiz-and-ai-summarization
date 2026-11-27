import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withWorkspace } from './workspace.fixture.ts';
import {
  createMockAIClient,
  type AIClient,
  AIProviderError,
} from '../../src/ai/client.ts';
import {
  createAIAdmissionRepository,
  quotaPolicy,
} from '../../src/repositories/ai-admission.repository.ts';
import { createAIUsageRepository } from '../../src/repositories/ai-usage.repository.ts';
import { createAIUsageService } from '../../src/services/ai-usage.service.ts';
import { createCallRunner } from '../../src/ai/call-policy.ts';
import { generationLimits } from '../../src/ai/chunking/plan.ts';
test('P6-T05 concurrent last daily request is admitted once and replay adds no call or charge', async () => {
  let release!: () => void,
    entered!: () => void,
    calls = 0;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    started = new Promise<void>((r) => {
      entered = r;
    });
  const base = createMockAIClient((request) => ({
    title: 'Quota summary',
    sections: [
      {
        heading: null,
        text: 'TCP',
        sourceKeys: z
          .object({ allowedSourceKeys: z.array(z.string()) })
          .parse(JSON.parse(request.prompt)).allowedSourceKeys,
      },
    ],
  }));
  const client: AIClient = {
    provider: base.provider,
    model: base.model,
    generate: async (request) => {
      calls++;
      entered();
      await gate;
      return base.generate(request);
    },
  };
  await withWorkspace(
    async ({ db, api, project, alice }) => {
      await db.note.create({
        data: { projectId: project.id, title: 'TCP', plainText: 'TCP' },
      });
      const body = {
          operation: 'SUMMARY',
          source: { scope: 'PROJECT' },
          settings: { length: 'SHORT', format: 'PARAGRAPHS' },
        },
        keys = [randomUUID(), randomUUID()];
      const post = (key: string) =>
        api
          .post('/api/v1/projects/' + project.id + '/generations')
          .auth('alice', { type: 'bearer' })
          .set('Idempotency-Key', key)
          .send(body);
      const pending = keys.map((key) => post(key).then((r) => r));
      try {
        await started;
        release();
        const results = await Promise.all(pending);
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 429]);
        assert.equal(calls, 1);
        const winner = results.findIndex((r) => r.status === 201),
          finished = results[winner]!;
        const replay = await post(keys[winner]!);
        assert.equal(replay.body.data.id, finished.body.data.id);
        assert.equal(calls, 1);
        assert.equal(await db.aIUsage.count({ where: { userId: alice.id } }), 1);
        const usage = await api.get('/api/v1/ai-usage').auth('alice', { type: 'bearer' });
        assert.equal(usage.body.quota.requestsUsed, 1);
        assert.equal(usage.body.quota.active, 0);
        assert.equal(usage.body.quota.accountedTokens, 140);
      } finally {
        release();
        await Promise.allSettled(pending);
      }
    },
    client,
    { quota: { ...quotaPolicy, dailyRequests: 1, userConcurrency: 2 } },
  );
});
test('P6-T05 injected UTC recovery clock releases unstarted work and conserves unknown running usage even on admission rejection', async () => {
  await withWorkspace(async ({ db, alice }) => {
    const now = new Date('2026-11-28T12:00:00Z'),
      data = {
        userId: alice.id,
        inputHash: 'a'.repeat(64),
        operation: 'SUMMARY' as const,
        provider: 'mock',
        model: 'fixed',
        reservedTokens: 100,
        accountedTokens: 100,
        createdAt: now,
        leaseExpiresAt: new Date(now.getTime() - 1),
      };
    const unused = await db.aIUsage.create({
      data: { ...data, requestKey: randomUUID(), status: 'RESERVED' },
    });
    const running = await db.aIUsage.create({
      data: { ...data, requestKey: randomUUID(), status: 'RUNNING' },
    });
    await assert.rejects(
      createAIAdmissionRepository(db, { ...quotaPolicy, dailyRequests: 0 }).reserve(
        { ...data, requestKey: randomUUID() },
        now,
      ),
      { code: 'AI_QUOTA' },
    );
    const a = await db.aIUsage.findUniqueOrThrow({ where: { id: unused.id } }),
      b = await db.aIUsage.findUniqueOrThrow({ where: { id: running.id } });
    assert.equal(a.status, 'FAILED');
    assert.equal(a.accountedTokens, 0);
    assert.equal(b.status, 'UNCERTAIN');
    assert.equal(b.accountedTokens, 100);
    assert.equal(a.completedAt!.toISOString(), now.toISOString());
    const ledger = createAIUsageRepository(db);
    await ledger.recordCall(alice.id, b.id, {
      number: 1,
      status: 'SUCCEEDED',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    assert.equal(
      (await db.aIUsage.findUniqueOrThrow({ where: { id: b.id } })).status,
      'UNCERTAIN',
    );
  });
});
test('P6-T05 retry and timeout observations settle real ledger rows according to charging policy', async () => {
  await withWorkspace(async ({ db, alice }) => {
    const ledger = createAIUsageRepository(db),
      usage = createAIUsageService(ledger);
    const reserve = async () =>
      ledger.start({
        userId: alice.id,
        requestKey: randomUUID(),
        inputHash: 'a'.repeat(64),
        operation: 'SUMMARY',
        provider: 'mock',
        model: 'fixed',
        reservedTokens: 1000,
        leaseExpiresAt: new Date(Date.now() + 60000),
      });
    let clock = 0;
    const row = await reserve(),
      client = createMockAIClient((_r, index) => {
        if (index === 1)
          throw new AIProviderError('TRANSIENT', 1000, {
            inputTokens: 0,
            outputTokens: 0,
          });
        return { ok: true };
      });
    const request = {
      system: 'trusted',
      prompt: 'synthetic',
      schema: z.object({ ok: z.boolean() }),
      maxOutputTokens: 50,
      signal: new AbortController().signal,
    };
    await createCallRunner(client, {
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      random: () => 0,
      observe: usage.observe(alice.id, row.id),
    }).call(request);
    await ledger.finish(alice.id, row.id, 'SUCCEEDED');
    const saved = await db.aIUsage.findUniqueOrThrow({
      where: { id: row.id },
      include: { calls: true },
    });
    assert.equal(clock, 1000);
    assert.equal(saved.calls.length, 2);
    assert.equal(saved.accountedTokens, 140);
    assert.equal(saved.estimatedCost, null);
    const timed = await reserve();
    const hanging: AIClient = {
      provider: 'mock',
      model: 'hang',
      generate: () => new Promise(() => {}),
    };
    await assert.rejects(
      createCallRunner(hanging, {
        limits: { ...generationLimits, callTimeoutMs: 20 },
        observe: usage.observe(alice.id, timed.id),
      }).call(request),
      (e) => e instanceof AIProviderError && e.kind === 'UNCERTAIN',
    );
    await ledger.finish(alice.id, timed.id, 'UNCERTAIN');
    const uncertain = await db.aIUsage.findUniqueOrThrow({
      where: { id: timed.id },
      include: { calls: true },
    });
    assert.equal(uncertain.calls.length, 1);
    assert.equal(uncertain.accountedTokens, 1000);
    assert.equal(uncertain.estimatedCost, null);
    assert.equal(uncertain.leaseExpiresAt, null);
  });
});
