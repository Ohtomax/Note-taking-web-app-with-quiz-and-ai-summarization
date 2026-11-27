import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createMockAIClient } from '../src/ai/client.ts';
import { createAIService } from '../src/services/ai.service.ts';
import { generationLimits } from '../src/ai/chunking/plan.ts';
import type { SourceManifest } from '../src/services/ai-sources.service.ts';
const source: SourceManifest = {
  projectId: 'p',
  projectRevision: 1,
  scope: 'PROJECT',
  sources: [
    {
      sourceKey: 'note:a',
      noteId: 'a',
      noteTitle: 'N',
      revision: 1,
      text: 'FIRST ' + 'x'.repeat(2500) + ' LAST',
      contentHash: 'hash',
      rangeStart: null,
      rangeEnd: null,
    },
  ],
};
test('P4-T06 all chunks influence bounded reduction and a failed middle chunk cannot complete', async () => {
  const make = (fail = false) =>
    createMockAIClient((request, index) => {
      if (fail && index === 2) throw new Error('Interrupted middle chunk');
      const data = JSON.parse(request.prompt) as {
        stage: string;
        sources: Array<{ sourceKey: string; text: string }>;
      };
      if (data.stage === 'FINAL')
        return { text: data.sources.map((s) => s.text).join(' ') };
      return {
        sections: data.sources.map((s) => ({
          text: s.text.includes('LAST')
            ? 'LAST'
            : s.text.includes('FIRST')
              ? 'FIRST'
              : 'middle',
          sourceKeys: [s.sourceKey],
        })),
      };
    });
  const client = make();
  const engine = createAIService(client, {
    ...generationLimits,
    chunkTokens: 1000,
    outputTokens: 500,
  });
  const result = await engine.run('SUMMARY', {}, source, z.object({ text: z.string() }));
  assert.match(result.object.text, /FIRST/);
  assert.match(result.object.text, /LAST/);
  assert.ok(result.calls > 3);
  await assert.rejects(
    createAIService(make(true), {
      ...generationLimits,
      chunkTokens: 1000,
      outputTokens: 500,
    }).run('SUMMARY', {}, source, z.object({ text: z.string() })),
    /Interrupted/,
  );
  const bad = createMockAIClient(() => ({
    sections: [{ text: 'Invented', sourceKeys: ['foreign'] }],
  }));
  await assert.rejects(
    createAIService(bad, {
      ...generationLimits,
      chunkTokens: 1000,
      outputTokens: 500,
    }).run('SUMMARY', {}, source, z.object({ text: z.string() })),
    /could not complete/,
  );
});
