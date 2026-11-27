import { z } from 'zod';
import { zodSchema } from 'ai';
import type { AIClient, AIRequest, AIResult, AIUsageCounts } from '@/ai/client.js';
import { AIProviderError } from '@/ai/client.js';
import {
  buildStudyPrompt,
  promptSourceKeys,
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
      const schemaTokens = estimateTokens(JSON.stringify(zodSchema(shape).jsonSchema));
      if (
        estimateTokens(prompt.system + prompt.prompt) +
          schemaTokens +
          limits.outputTokens >
          limits.contextTokens ||
        estimateTokens(prompt.system + prompt.prompt) + schemaTokens >
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
      if (
        estimateTokens(JSON.stringify(result.object)) > limits.outputTokens * 4 ||
        (result.usage.outputTokens !== null &&
          result.usage.outputTokens > limits.outputTokens)
      )
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
      const schemaTokens = estimateTokens(
        JSON.stringify(
          plan.chunks.length === 1
            ? zodSchema(schema).jsonSchema
            : zodSchema(mapResultSchema).jsonSchema,
        ),
      );
      if (
        estimateTokens(p.system + p.prompt) + schemaTokens >
          limits.chunkTokens + limits.promptReserve ||
        estimateTokens(p.system + p.prompt) + schemaTokens + limits.outputTokens >
          limits.contextTokens
      )
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
        validateCoverage(result, promptSourceKeys(chunk.sources));
        level.push({ sources: chunk.sources, result });
      }
      const compact = (item: (typeof level)[number]): PromptSource[] =>
        item.result.sections.map((section) => ({
          sourceKey: section.sourceKeys[0]!,
          sourceKeys: section.sourceKeys,
          revision: item.sources[0]!.revision,
          references: [
            ...new Map(
              item.sources
                .flatMap(
                  (source) =>
                    source.references ?? [
                      { sourceKey: source.sourceKey, revision: source.revision },
                    ],
                )
                .filter((reference) => section.sourceKeys.includes(reference.sourceKey))
                .map((reference) => [reference.sourceKey, reference]),
            ).values(),
          ],
          text: section.text,
          rangeStart: null,
          rangeEnd: null,
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
          validateCoverage(result, promptSourceKeys(sources));
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
