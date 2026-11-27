import { z } from 'zod';
import type { AIClient, AIRequest, AIResult, AIUsageCounts } from '@/ai/client.js';
import { AIProviderError } from '@/ai/client.js';
import {
  buildStudyPrompt,
  type AIOperation,
  type PromptSource,
} from '@/ai/prompts/study.js';
import { planSources, estimateTokens, generationLimits } from '@/ai/chunking/plan.js';
import type { SourceManifest } from '@/services/ai-sources.service.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const mapResultSchema = z
  .object({
    sections: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(4000),
            sourceKeys: z.array(z.string().min(1).max(100)).min(1).max(200),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type MapResult = z.infer<typeof mapResultSchema>;
export interface AICallRunner {
  call: <T>(request: AIRequest<T>) => Promise<AIResult<T>>;
}
export function validateCoverage(value: MapResult, allowed: string[]) {
  const keys = value.sections.flatMap((section) => section.sourceKeys);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    allowed.some((key) => !keys.includes(key))
  )
    throw new AIProviderError('INVALID');
}
export const createAIService = (client: AIClient, limits = generationLimits) => ({
  run: async <T>(
    operation: AIOperation,
    settings: Record<string, unknown>,
    manifest: SourceManifest,
    schema: z.ZodType<T>,
    runner: AICallRunner = { call: (request) => client.generate(request) },
    signal = new AbortController().signal,
  ): Promise<{ object: T; usage: AIUsageCounts; calls: number }> => {
    const plan = planSources(manifest, limits);
    let calls = 0,
      input = 0,
      output = 0,
      known = true;
    const invoke = async <U>(
      sources: PromptSource[],
      stage: 'MAP' | 'MERGE' | 'FINAL',
      shape: z.ZodType<U>,
    ) => {
      const prompt = buildStudyPrompt(operation, settings, sources, stage);
      if (
        estimateTokens(prompt.system + prompt.prompt) + limits.outputTokens >
          limits.contextTokens ||
        estimateTokens(prompt.system + prompt.prompt) >
          limits.chunkTokens + limits.promptReserve
      )
        throw new ServiceError(
          'SOURCE_LIMIT',
          'Generation stage exceeds the supported budget.',
          422,
        );
      if (++calls > plan.maxCalls)
        throw new ServiceError('SOURCE_LIMIT', 'Generation stage limit reached.', 422);
      const result = await runner.call({
        ...prompt,
        schema: shape,
        maxOutputTokens: limits.outputTokens,
        signal,
      });
      if (result.usage.inputTokens === null || result.usage.outputTokens === null)
        known = false;
      else {
        input += result.usage.inputTokens;
        output += result.usage.outputTokens;
      }
      if (estimateTokens(JSON.stringify(result.object)) > limits.outputTokens)
        throw new AIProviderError('INVALID');
      return shape.parse(result.object);
    };
    // Preflight every map prompt before making the first billable call.
    for (const chunk of plan.chunks) {
      const p = buildStudyPrompt(
        operation,
        settings,
        chunk.sources,
        plan.chunks.length === 1 ? 'FINAL' : 'MAP',
      );
      if (estimateTokens(p.system + p.prompt) > limits.chunkTokens + limits.promptReserve)
        throw new ServiceError(
          'SOURCE_LIMIT',
          'Generation prompt exceeds its budget.',
          422,
        );
    }
    let finalSources: PromptSource[];
    if (plan.chunks.length === 1) finalSources = plan.chunks[0]!.sources;
    else {
      let level: Array<{ sources: PromptSource[]; result: MapResult }> = [];
      for (const chunk of plan.chunks) {
        const result = await invoke(chunk.sources, 'MAP', mapResultSchema);
        validateCoverage(result, [...new Set(chunk.sources.map((s) => s.sourceKey))]);
        level.push({ sources: chunk.sources, result });
      }
      const compact = (item: (typeof level)[number]): PromptSource[] =>
        [...new Set(item.sources.map((s) => s.sourceKey))].map((key) => ({
          ...item.sources.find((s) => s.sourceKey === key)!,
          text: JSON.stringify(
            item.result.sections.filter((section) => section.sourceKeys.includes(key)),
          ),
        }));
      while (level.length > 1) {
        const next: typeof level = [];
        for (let index = 0; index < level.length; index += 2) {
          if (!level[index + 1]) {
            next.push(level[index]!);
            continue;
          }
          const sources = [...compact(level[index]!), ...compact(level[index + 1]!)];
          const result = await invoke(sources, 'MERGE', mapResultSchema);
          validateCoverage(result, [...new Set(sources.map((s) => s.sourceKey))]);
          next.push({ sources, result });
        }
        level = next;
      }
      finalSources = compact(level[0]!);
    }
    const object = await invoke(finalSources, 'FINAL', schema);
    return {
      object,
      usage: { inputTokens: known ? input : null, outputTokens: known ? output : null },
      calls,
    };
  },
});
export type AIService = ReturnType<typeof createAIService>;
