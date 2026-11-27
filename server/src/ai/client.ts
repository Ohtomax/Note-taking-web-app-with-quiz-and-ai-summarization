import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { APICallError, generateObject, NoObjectGeneratedError } from 'ai';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const aiConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    apiKey: z.string().trim().min(1).optional(),
    model: z
      .string()
      .regex(/^[a-zA-Z0-9/_.-]+$/)
      .max(100)
      .default('openai/gpt-oss-120b'),
  })
  .refine((value) => !value.enabled || Boolean(value.apiKey));
export function parseAIConfig(input: unknown) {
  const result = aiConfigSchema.safeParse(input);
  if (!result.success) throw new Error('Invalid AI configuration');
  return result.data;
}
export interface AIUsageCounts {
  inputTokens: number | null;
  outputTokens: number | null;
}
export interface AIRequest<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxOutputTokens: number;
  signal: AbortSignal;
}
export interface AIResult<T> {
  object: T;
  usage: AIUsageCounts;
}
export interface AIClient {
  available?: boolean;
  provider: string;
  model: string;
  generate: <T>(request: AIRequest<T>) => Promise<AIResult<T>>;
}
export class AIProviderError extends ServiceError {
  constructor(
    public readonly kind: 'TRANSIENT' | 'UNCERTAIN' | 'INVALID',
    public readonly retryAfterMs = 0,
    public readonly usage: AIUsageCounts = { inputTokens: null, outputTokens: null },
  ) {
    super(
      'AI_' + kind,
      'AI generation could not complete. Retrieve its status before retrying.',
      kind === 'INVALID' ? 422 : 503,
    );
  }
}
export function createAIClient(
  config: ReturnType<typeof parseAIConfig>,
  transport?: typeof fetch,
): AIClient {
  const provider = createOpenAI({
    name: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: config.apiKey ?? 'unconfigured',
    compatibility: 'compatible',
    ...(transport ? { fetch: transport } : {}),
  });
  return {
    available: config.enabled,
    provider: 'groq',
    model: config.model,
    generate: async (request) => {
      if (!config.enabled)
        throw new ServiceError('AI_UNAVAILABLE', 'AI generation is not configured.', 503);
      try {
        const result = await generateObject({
          model: provider.chat(config.model, { structuredOutputs: true }),
          system: request.system,
          prompt: request.prompt,
          schema: request.schema,
          mode: 'json',
          maxTokens: request.maxOutputTokens,
          abortSignal: request.signal,
          maxRetries: 0,
          experimental_telemetry: { isEnabled: false },
        });
        return {
          object: result.object,
          usage: {
            inputTokens: Number.isFinite(result.usage.promptTokens)
              ? result.usage.promptTokens
              : null,
            outputTokens: Number.isFinite(result.usage.completionTokens)
              ? result.usage.completionTokens
              : null,
          },
        };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error))
          throw new AIProviderError('INVALID', 0, {
            inputTokens: Number.isFinite(error.usage?.promptTokens)
              ? error.usage!.promptTokens
              : null,
            outputTokens: Number.isFinite(error.usage?.completionTokens)
              ? error.usage!.completionTokens
              : null,
          });
        if (APICallError.isInstance(error)) {
          const delay = Number(error.responseHeaders?.['retry-after'] ?? 0) * 1000;
          throw new AIProviderError(
            error.statusCode === 429 || error.statusCode === 503
              ? 'TRANSIENT'
              : error.statusCode && error.statusCode < 500
                ? 'INVALID'
                : 'UNCERTAIN',
            Number.isFinite(delay) ? Math.max(0, delay) : 0,
          );
        }
        throw new AIProviderError('UNCERTAIN');
      }
    },
  };
}
// Tests inject responses explicitly. Production configuration never selects a mock.
export function createMockAIClient(
  respond: (request: AIRequest<unknown>, call: number) => unknown,
): AIClient & { calls: AIRequest<unknown>[] } {
  const calls: AIRequest<unknown>[] = [];
  return {
    provider: 'mock',
    model: 'deterministic-v1',
    calls,
    generate: async (request) => {
      request.signal.throwIfAborted();
      calls.push(request);
      const result = request.schema.safeParse(respond(request, calls.length));
      if (!result.success)
        throw new AIProviderError('INVALID', 0, { inputTokens: 100, outputTokens: 40 });
      return {
        object: result.data,
        usage: { inputTokens: 100, outputTokens: 40 },
      };
    },
  };
}
