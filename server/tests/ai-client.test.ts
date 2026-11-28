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

test('Gemini streams structured JSON and counts streamed thinking tokens', async () => {
  const transport: typeof fetch = async (url) => {
    assert.match(String(url), /:streamGenerateContent\?alt=sse$/);
    const frames = [
      {
        candidates: [
          { content: { role: 'model', parts: [{ text: '{"first":"Part A",' }] } },
        ],
      },
      {
        candidates: [
          {
            content: { role: 'model', parts: [{ text: '"second":"Part B"}' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 20,
          candidatesTokenCount: 5,
          thoughtsTokenCount: 3,
          totalTokenCount: 28,
        },
      },
    ];
    const text = frames
      .map((frame) => 'data: ' + JSON.stringify(frame) + '\n\n')
      .join('');
    return new Response(
      new ReadableStream({
        start(controller) {
          const bytes = new TextEncoder().encode(text);
          controller.enqueue(bytes.slice(0, 110));
          controller.enqueue(bytes.slice(110));
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  };
  const client = createAIClient(
    parseAIConfig({ enabled: true, apiKey: 'synthetic' }),
    transport,
  );
  const partials: unknown[] = [];
  const result = await client.generate({
    system: 'trusted',
    prompt: 'untrusted data',
    schema: z.object({ first: z.string(), second: z.string() }).strict(),
    maxOutputTokens: 100,
    signal: new AbortController().signal,
    onPartial: (value) => partials.push(value),
  });
  assert.ok(partials.length >= 2);
  assert.deepEqual(result, {
    object: { first: 'Part A', second: 'Part B' },
    usage: { inputTokens: 20, outputTokens: 8 },
  });
});
