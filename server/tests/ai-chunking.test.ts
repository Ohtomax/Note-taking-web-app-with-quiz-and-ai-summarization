import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planSources, generationLimits } from '../src/ai/chunking/plan.ts';
import type { SourceManifest } from '../src/services/ai-sources.service.ts';
export function manifest(texts: string[]): SourceManifest {
  return {
    projectId: 'p',
    projectRevision: 1,
    scope: 'PROJECT',
    sources: texts.map((text, i) => ({
      sourceKey: 'note:' + i,
      noteId: '' + i,
      noteTitle: 'Title',
      revision: 1,
      text,
      contentHash: 'hash',
      rangeStart: null,
      rangeEnd: null,
    })),
  };
}
test('P4-T05 covers all ordered Unicode ranges and packs small notes into bounded calls', () => {
  const input = manifest([
    'First😀'.repeat(1000),
    ...Array.from({ length: 40 }, (_, i) => 'Concept ' + i),
  ]);
  const plan = planSources(input, { ...generationLimits, chunkTokens: 1000 });
  for (const source of input.sources) {
    const parts = plan.chunks
      .flatMap((c) => c.sources)
      .filter((s) => s.sourceKey === source.sourceKey);
    assert.equal(parts.map((p) => p.text).join(''), source.text);
    let cursor = 0;
    for (const part of parts) {
      assert.equal(part.rangeStart, cursor);
      cursor = part.rangeEnd!;
    }
    assert.equal(cursor, [...source.text].length);
  }
  assert.equal(planSources(manifest(['small', 'note'])).chunks.length, 1);
  assert.throws(() => planSources(manifest(['x'.repeat(100001)])), /budget/);
  assert.equal(planSources(manifest(['x'.repeat(100000)])).estimatedSourceTokens, 100000);
});
