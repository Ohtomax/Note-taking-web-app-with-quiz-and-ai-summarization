import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createMockAIClient, AIProviderError, type AIClient } from '../src/ai/client.ts';
import { createCallRunner, type CallEvent } from '../src/ai/call-policy.ts';
import { generationLimits } from '../src/ai/chunking/plan.ts';
const request = {
  system: 'trusted',
  prompt: 'data',
  schema: z.object({ ok: z.boolean() }),
  maxOutputTokens: 100,
  signal: new AbortController().signal,
};
test('P4-T07 retry delays, attempts and total deadlines are bounded with a fake clock', async () => {
  let now = 0;
  const events: CallEvent[] = [];
  const client = createMockAIClient((_r, index) => {
    if (index < 3)
      throw new AIProviderError('TRANSIENT', 1000, { inputTokens: 0, outputTokens: 0 });
    return { ok: true };
  });
  const runner = createCallRunner(client, {
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
    random: () => 0,
    observe: async (event) => {
      events.push(event);
    },
  });
  assert.equal((await runner.call(request)).object.ok, true);
  assert.equal(now, 2000);
  assert.equal(events.filter((e) => e.status === 'RUNNING').length, 3);
  const invalid = createMockAIClient(() => {
    throw new AIProviderError('INVALID');
  });
  await assert.rejects(createCallRunner(invalid).call(request));
  assert.equal(invalid.calls.length, 1);
  const throttled = createMockAIClient(() => {
    throw new AIProviderError('TRANSIENT', 60000);
  });
  await assert.rejects(
    createCallRunner(throttled, {
      now: () => 0,
      sleep: async () => {
        throw new Error('Must not sleep');
      },
    }).call(request),
    /deadline/,
  );
  assert.equal(throttled.calls.length, 1);
});
test('P4-T07 timed out calls become uncertain and are never automatically retried', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const client: AIClient = {
    provider: 'mock',
    model: 'hang',
    generate: () => new Promise(() => {}),
  };
  const runner = createCallRunner(client, {
    limits: { ...generationLimits, callTimeoutMs: 20 },
  });
  const pending = runner.call(request);
  await Promise.resolve();
  context.mock.timers.tick(21);
  await assert.rejects(
    pending,
    (error) => error instanceof AIProviderError && error.kind === 'UNCERTAIN',
  );
});
