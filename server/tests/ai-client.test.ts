import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createAIClient, createMockAIClient, parseAIConfig } from '../src/ai/client.ts';
test('P4-T01 invalid AI configuration is redacted and missing configuration fails closed', async () => {
  assert.throws(
    () => parseAIConfig({ enabled: true, apiKey: '', model: 'secret value' }),
    /^Error: Invalid AI configuration$/,
  );
  const client = createAIClient(parseAIConfig({}));
  await assert.rejects(
    client.generate({
      system: 'trusted',
      prompt: 'data',
      schema: z.object({ ok: z.boolean() }),
      maxOutputTokens: 100,
      signal: new AbortController().signal,
    }),
    /not configured/,
  );
});
test('P4-T01 deterministic adapter uses the same validated contract without network', async () => {
  const client = createMockAIClient(() => ({ ok: true }));
  assert.deepEqual(
    await client.generate({
      system: 'trusted',
      prompt: 'data',
      schema: z.object({ ok: z.boolean() }),
      maxOutputTokens: 100,
      signal: new AbortController().signal,
    }),
    { object: { ok: true }, usage: { inputTokens: 100, outputTokens: 40 } },
  );
  assert.equal(client.calls.length, 1);
});
test('P4-T01 production adapter issues a schema constrained request with no SDK retries', async () => {
  let sent: Record<string, unknown> = {};
  const transport: typeof fetch = async (_url, init) => {
    sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: 'fixture',
        object: 'chat.completion',
        created: 1,
        model: 'openai/gpt-oss-120b',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{"ok":true}' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 25, completion_tokens: 5, total_tokens: 30 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
  const client = createAIClient(
    parseAIConfig({ enabled: true, apiKey: 'synthetic' }),
    transport,
  );
  const result = await client.generate({
    system: 'trusted',
    prompt: 'untrusted data',
    schema: z.object({ ok: z.boolean() }).strict(),
    maxOutputTokens: 100,
    signal: new AbortController().signal,
  });
  assert.equal(result.object.ok, true);
  assert.deepEqual(result.usage, { inputTokens: 25, outputTokens: 5 });
  assert.equal((sent.response_format as { type: string }).type, 'json_schema');
  assert.equal(sent.tools, undefined);
});
