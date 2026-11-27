import type { SourceManifest } from '@/services/ai-sources.service.js';
import type { PromptSource } from '@/ai/prompts/study.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const generationLimits = {
  contextTokens: 131072,
  chunkTokens: 20000,
  sourceTokens: 100000,
  outputTokens: 8000,
  promptReserve: 6000,
  maxCalls: 32,
  retries: 2,
  callTimeoutMs: 20000,
  deadlineMs: 55000,
};
export const estimateTokens = (text: string) => Buffer.byteLength(text, 'utf8');
export interface SourceChunk {
  id: string;
  sources: PromptSource[];
}
export interface GenerationPlan {
  chunks: SourceChunk[];
  estimatedSourceTokens: number;
  maxCalls: number;
  reservedTokens: number;
}
export function planSources(
  manifest: SourceManifest,
  limits = generationLimits,
): GenerationPlan {
  const total = manifest.sources.reduce((sum, s) => sum + estimateTokens(s.text), 0);
  if (
    total > limits.sourceTokens ||
    limits.chunkTokens + limits.outputTokens + limits.promptReserve >
      limits.contextTokens ||
    limits.chunkTokens < 512
  )
    throw new ServiceError(
      'SOURCE_LIMIT',
      'Source material exceeds the supported generation budget.',
      422,
    );
  const chunks: SourceChunk[] = [];
  let current: PromptSource[] = [];
  let cost = 0;
  const flush = () => {
    if (current.length) {
      chunks.push({ id: 'chunk_' + (chunks.length + 1), sources: current });
      current = [];
      cost = 0;
    }
  };
  for (const source of manifest.sources) {
    const points = [...source.text];
    let start = 0;
    while (start < points.length) {
      let end = start;
      let bytes = 0;
      const overhead =
        estimateTokens(
          JSON.stringify({
            sourceKey: source.sourceKey,
            revision: source.revision,
            rangeStart: 0,
            rangeEnd: points.length,
            text: '',
          }),
        ) + 32;
      const available = limits.chunkTokens - cost - overhead;
      while (end < points.length) {
        const size = estimateTokens(JSON.stringify(points[end]).slice(1, -1));
        if (bytes + size > available) break;
        bytes += size;
        end++;
      }
      if (end === start) {
        flush();
        continue;
      }
      current.push({
        sourceKey: source.sourceKey,
        revision: source.revision,
        text: points.slice(start, end).join(''),
        rangeStart: (source.rangeStart ?? 0) + start,
        rangeEnd: (source.rangeStart ?? 0) + end,
      });
      cost += bytes + overhead;
      start = end;
      if (start < points.length) flush();
    }
  }
  flush();
  if (!chunks.length || chunks.length > limits.maxCalls - 2)
    throw new ServiceError(
      'SOURCE_LIMIT',
      'Source material requires too many generation stages.',
      422,
    );
  // Map at most N chunks, then pairwise reduction and final output. A single chunk needs one call.
  const maxCalls = chunks.length === 1 ? 1 : 2 * chunks.length;
  if (maxCalls > limits.maxCalls)
    throw new ServiceError(
      'SOURCE_LIMIT',
      'Source material requires too many generation stages.',
      422,
    );
  return {
    chunks,
    estimatedSourceTokens: total,
    maxCalls,
    reservedTokens:
      maxCalls *
      (limits.retries + 1) *
      (limits.chunkTokens + limits.outputTokens + limits.promptReserve),
  };
}
