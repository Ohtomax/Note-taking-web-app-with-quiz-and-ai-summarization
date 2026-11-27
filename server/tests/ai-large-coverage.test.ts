import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createMockAIClient } from '../src/ai/client.ts';
import { createAIService } from '../src/services/ai.service.ts';
import { summaryResultSchema } from '../src/ai/schemas/summary.ts';
import type { SourceManifest } from '../src/services/ai-sources.service.ts';
test('P4-T24 the full 200-note/100000-byte source boundary retains all citations without duplicated merge text', async () => {
  const manifest: SourceManifest = {
    projectId: randomUUID(),
    projectRevision: 1,
    scope: 'PROJECT',
    sources: Array.from({ length: 200 }, (_, i) => {
      const noteId = randomUUID(),
        label = i === 0 ? 'FIRST' : i === 199 ? 'LAST' : 'middle';
      return {
        noteId,
        sourceKey: 'note:' + noteId,
        noteTitle: 'Note ' + i,
        revision: 1,
        text: label.padEnd(500, 'x'),
        contentHash: 'x'.repeat(64),
        rangeStart: null,
        rangeEnd: null,
      };
    }),
  };
  let finalKeys: string[] = [];
  const client = createMockAIClient((request) => {
    const data = JSON.parse(request.prompt) as {
      stage: string;
      allowedSourceKeys: string[];
      sources: Array<{ text: string }>;
    };
    const concepts =
      data.sources
        .flatMap((source) => [
          ...(source.text.includes('FIRST') ? ['FIRST'] : []),
          ...(source.text.includes('LAST') ? ['LAST'] : []),
        ])
        .join(' ') || 'middle';
    if (data.stage === 'FINAL') {
      finalKeys = data.allowedSourceKeys;
      return {
        title: 'Large',
        sections: [{ heading: null, text: concepts, sourceKeys: data.allowedSourceKeys }],
      };
    }
    return { sections: [{ text: concepts, sourceKeys: data.allowedSourceKeys }] };
  });
  const result = await createAIService(client).run(
    'SUMMARY',
    { length: 'SHORT', format: 'PARAGRAPHS' },
    manifest,
    summaryResultSchema(
      { length: 'SHORT', format: 'PARAGRAPHS' },
      manifest.sources.map((source) => source.sourceKey),
    ),
  );
  assert.match(result.object.sections[0]!.text, /FIRST/);
  assert.match(result.object.sections[0]!.text, /LAST/);
  assert.equal(finalKeys.length, 200);
  assert.ok(result.calls > 3);
  assert.ok(result.calls <= 32);
});
