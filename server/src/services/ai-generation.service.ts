import { z } from 'zod';
import type { AIClient } from '@/ai/client.js';
import { AIProviderError } from '@/ai/client.js';
import { createCallRunner } from '@/ai/call-policy.js';
import { planSources, generationLimits } from '@/ai/chunking/plan.js';
import { createAIService } from './ai.service.js';
import type { AISourcesService } from './ai-sources.service.js';
import { hashContent } from './ai-sources.service.js';
import type { SourceRequest } from '@/utils/input-validators/ai-sources.js';
import type { AIGenerationRepository } from '@/repositories/ai-generation.repository.js';
import type { AIAdmissionRepository } from '@/repositories/ai-admission.repository.js';
import type { AIUsageService } from './ai-usage.service.js';
import type { AIOperation } from '@/ai/prompts/study.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export const createAIGenerationService = (dependencies: {
  client: AIClient;
  sources: AISourcesService;
  repository: AIGenerationRepository;
  admission: AIAdmissionRepository;
  usage: AIUsageService;
}) => {
  const { client, sources, repository, admission, usage } = dependencies;
  return {
    get: repository.get,
    execute: async <T>(
      userId: string,
      projectId: string,
      requestKey: string,
      operation: AIOperation,
      source: SourceRequest,
      settings: Record<string, unknown>,
      schema: z.ZodType<T>,
    ) => {
      const manifest = await sources.resolve(userId, projectId, source);
      const inputHash = hashContent(
        JSON.stringify(
          canonical({
            operation,
            projectId,
            source,
            settings,
            sources: manifest.sources,
          }),
        ),
      );
      const reuse = async (
        record: NonNullable<Awaited<ReturnType<typeof repository.findKey>>>,
      ) => {
        if (record.inputHash !== inputHash)
          throw new ServiceError(
            'IDEMPOTENCY_CONFLICT',
            'Use a new key for changed settings or sources.',
            409,
          );
        return repository.get(userId, record.id);
      };
      const previous = await repository.findKey(userId, requestKey);
      if (previous) return reuse(previous);
      if (client.available === false)
        throw new ServiceError('AI_UNAVAILABLE', 'AI generation is not configured.', 503);
      const plan = planSources(manifest);
      // Recheck after collection and before admission. A later edit is shown as a stale source on saved material.
      const current = await sources.resolve(userId, projectId, source);
      if (
        hashContent(JSON.stringify(current.sources)) !==
        hashContent(JSON.stringify(manifest.sources))
      )
        throw new ServiceError('SOURCE_CHANGED', 'Select current source revisions.', 409);
      let record;
      try {
        record = await admission.reserve({
          userId,
          requestKey,
          inputHash,
          operation,
          provider: client.provider,
          model: client.model,
          reservedTokens: plan.reservedTokens,
          leaseExpiresAt: new Date(Date.now() + generationLimits.deadlineMs + 10000),
        });
      } catch (error) {
        const duplicate = await repository.findKey(userId, requestKey);
        if (duplicate) return reuse(duplicate);
        throw error;
      }
      try {
        const runner = createCallRunner(client, {
          observe: usage.observe(userId, record.id),
        });
        const result = await createAIService(client).run(
          operation,
          settings,
          manifest,
          schema,
          runner,
        );
        return await repository.complete(userId, record.id, {
          projectId,
          operation,
          settings,
          manifest,
          output: result.object,
        });
      } catch (error) {
        const uncertain = error instanceof AIProviderError && error.kind === 'UNCERTAIN';
        await repository.fail(
          userId,
          record.id,
          uncertain ? 'UNCERTAIN' : 'FAILED',
          uncertain ? 'AI_UNCERTAIN' : 'AI_GENERATION_FAILED',
        );
        return repository.get(userId, record.id);
      }
    },
  };
};
export type AIGenerationService = ReturnType<typeof createAIGenerationService>;
