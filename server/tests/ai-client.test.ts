import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { AIProviderError, createAIClient, createMockAIClient } from '../src/ai/client.ts';
import { parseAIConfig } from '../src/ai/config.ts';
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
test('P4-T01 Gemini sends a native schema request and counts thinking tokens', async () => {
  const transport: typeof fetch = async (url, init) => {
    assert.equal(
      String(url),
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    );
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'synthetic');
    assert.deepEqual(JSON.parse(String(init?.body)), {
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          required: ['ok'],
          type: 'object',
          properties: { ok: { type: 'boolean' } },
        },
      },
      systemInstruction: { parts: [{ text: 'trusted' }] },
      contents: [{ role: 'user', parts: [{ text: 'untrusted data' }] }],
    });
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: { role: 'model', parts: [{ text: '{"ok":true}' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 25,
          candidatesTokenCount: 5,
          thoughtsTokenCount: 2,
          totalTokenCount: 32,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
  const client = createAIClient(
    parseAIConfig({ enabled: true, apiKey: 'synthetic' }),
    transport,
  );
  const request = {
    system: 'trusted',
    prompt: 'untrusted data',
    schema: z.object({ ok: z.boolean() }).strict(),
    maxOutputTokens: 100,
    signal: new AbortController().signal,
  };
  const result = await client.generate(request);
  assert.equal(client.provider, 'gemini');
  assert.equal(result.object.ok, true);
  assert.deepEqual(result.usage, { inputTokens: 25, outputTokens: 7 });
  await assert.rejects(
    client.generate({ ...request, schema: request.schema.refine(() => false) }),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.equal(error.kind, 'INVALID');
      assert.deepEqual(error.usage, { inputTokens: 25, outputTokens: 7 });
      return true;
    },
  );
});
