import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { withWorkspace } from './workspace.fixture.ts';
import {
  createMockAIClient,
  AIProviderError,
  type AIClient,
} from '../../src/ai/client.ts';
import { generationLimits, planSources } from '../../src/ai/chunking/plan.ts';
import { storedGenerationSchema } from '../../src/utils/input-validators/generations.ts';
test('P6-T11 complete folder retains endpoints under simulated provider delays and conserves uncertainty on timeout', async (context) => {
  let timeout = false,
    invocations = 0;
  const base = createMockAIClient((request) => {
    const envelope = z
      .object({
        stage: z.string(),
        allowedSourceKeys: z.array(z.string()),
        sources: z.array(z.object({ text: z.string() })),
      })
      .parse(JSON.parse(request.prompt));
    const concepts =
      envelope.sources
        .flatMap((s) => [
          ...(s.text.includes('FIRST_CONCEPT') ? ['FIRST_CONCEPT'] : []),
          ...(s.text.includes('LAST_CONCEPT') ? ['LAST_CONCEPT'] : []),
        ])
        .join(' ') || 'middle';
    return envelope.stage === 'FINAL'
      ? {
          title: 'Large folder',
          sections: [
            { heading: null, text: concepts, sourceKeys: envelope.allowedSourceKeys },
          ],
        }
      : { sections: [{ text: concepts, sourceKeys: envelope.allowedSourceKeys }] };
  });
  const client: AIClient = {
    provider: base.provider,
    model: base.model,
    generate: async (request) => {
      invocations++;
      await delay(5);
      if (timeout) throw new AIProviderError('UNCERTAIN');
      return base.generate(request);
    },
  };
  await withWorkspace(async ({ db, project, api, alice }) => {
    await db.note.createMany({
      data: Array.from({ length: 200 }, (_, i) => ({
        projectId: project.id,
        title: 'Note ' + i,
        plainText: (i === 0
          ? 'FIRST_CONCEPT'
          : i === 199
            ? 'LAST_CONCEPT'
            : 'middle'
        ).padEnd(500, 'x'),
        createdAt: new Date(1760000000000 + i),
      })),
    });
    const post = (key: string) =>
      api
        .post('/api/v1/projects/' + project.id + '/generations')
        .auth('alice', { type: 'bearer' })
        .set('Idempotency-Key', key)
        .send({
          operation: 'SUMMARY',
          source: { scope: 'PROJECT' },
          settings: { length: 'DETAILED', format: 'PARAGRAPHS' },
        });
    const began = performance.now(),
      response = await post(randomUUID()),
      elapsed = performance.now() - began;
    assert.equal(response.body.data.status, 'SUCCEEDED');
    assert.equal(response.body.data.result.sources.length, 200);
    const record = await db.aIUsage.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    const captured = storedGenerationSchema.parse(record.result),
      plan = planSources(captured.manifest);
    assert.equal(plan.estimatedSourceTokens, 100000);
    assert.ok(base.calls.length <= plan.maxCalls);
    const text = JSON.stringify(response.body.data.result.output);
    assert.ok(text.includes('FIRST_CONCEPT'));
    assert.ok(text.includes('LAST_CONCEPT'));
    assert.equal(
      new Set(
        response.body.data.result.sources.map((s: { sourceKey: string }) => s.sourceKey),
      ).size,
      200,
    );
    assert.ok(elapsed < generationLimits.deadlineMs);
    assert.equal(
      (
        await api
          .post('/api/v1/projects/' + project.id + '/summaries')
          .auth('alice', { type: 'bearer' })
          .send({ generationId: record.id })
      ).status,
      201,
    );
    context.diagnostic(
      'P6_LONG_FOLDER ' +
        JSON.stringify({
          notes: 200,
          sourceBytes: 100000,
          estimatedSourceTokens: plan.estimatedSourceTokens,
          plannedMaxCalls: plan.maxCalls,
          providerCalls: base.calls.length,
          perCallDelayMs: 5,
          elapsedMs: Math.round(elapsed),
        }),
    );
    timeout = true;
    const key = randomUUID(),
      failed = await post(key),
      beforeRetry = invocations;
    assert.equal(failed.body.data.status, 'UNCERTAIN');
    assert.equal(failed.body.data.result, null);
    assert.equal((await post(key)).body.data.id, failed.body.data.id);
    assert.equal(invocations, beforeRetry);
    const uncertain = await db.aIUsage.findUniqueOrThrow({
      where: { id: failed.body.data.id, userId: alice.id },
    });
    assert.equal(uncertain.accountedTokens, uncertain.reservedTokens);
    assert.ok(uncertain.accountedTokens > 0);
    assert.equal(uncertain.leaseExpiresAt, null);
    assert.equal(await db.summary.count({ where: { projectId: project.id } }), 1);
    assert.equal(await db.note.count({ where: { projectId: project.id } }), 200);
  }, client);
});
