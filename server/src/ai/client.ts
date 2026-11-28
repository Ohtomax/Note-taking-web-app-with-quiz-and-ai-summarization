import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  APICallError,
  generateObject,
  streamObject,
  type LanguageModel,
  NoObjectGeneratedError,
  wrapLanguageModel,
} from 'ai';
import type { parseAIConfig } from '@/ai/config.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

import { observeGeminiStream, streamUsage } from '@/ai/gemini-stream.js';

const geminiTokenUsageSchema = z.object({
  usageMetadata: z.object({ totalTokenCount: z.number().int().nonnegative() }),
});
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
  onPartial?: (value: unknown) => void;
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
async function generateStreaming<T>(
  model: LanguageModel,
  request: AIRequest<T>,
): Promise<AIResult<T>> {
  const meter: { input?: number; total?: number } = {};
  const usage = () => ({
    inputTokens: meter.input ?? null,
    outputTokens:
      meter.input !== undefined && meter.total !== undefined && meter.total >= meter.input
        ? meter.total - meter.input
        : null,
  });
  return streamUsage.run(meter, async () => {
    const result = streamObject({
      model,
      system: request.system,
      prompt: request.prompt,
      schema: request.schema,
      mode: 'json',
      maxTokens: request.maxOutputTokens,
      abortSignal: request.signal,
      maxRetries: 0,
      onError: () => {},
      experimental_telemetry: { isEnabled: false },
    });
    const final = Promise.allSettled([result.object, result.usage]);
    for await (const partial of result.partialObjectStream) request.onPartial?.(partial);
    const [object] = await final;
    if (object.status === 'rejected') {
      if (NoObjectGeneratedError.isInstance(object.reason))
        throw new AIProviderError('INVALID', 0, usage());
      throw object.reason;
    }
    return { object: object.value, usage: usage() };
  });
}

export function createAIClient(
  config: ReturnType<typeof parseAIConfig>,
  transport?: typeof fetch,
): AIClient {
  const gemini = createGoogleGenerativeAI({
    apiKey: config.apiKey ?? 'unconfigured',
    fetch: observeGeminiStream(transport),
  });
  const model = wrapLanguageModel({
    model: gemini(config.model),
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        const metadata = geminiTokenUsageSchema.safeParse(result.rawResponse?.body);
        const promptTokens = result.usage.promptTokens;
        // The SDK's candidate count excludes Gemini thinking tokens. There are no tools.
        const totalTokens = metadata.success
          ? metadata.data.usageMetadata.totalTokenCount
          : NaN;
        return {
          ...result,
          usage: {
            promptTokens,
            completionTokens:
              totalTokens >= promptTokens ? totalTokens - promptTokens : NaN,
          },
        };
      },
    },
  });
  return {
    available: config.enabled,
    provider: 'gemini',
    model: config.model,
    generate: async (request) => {
      if (!config.enabled)
        throw new ServiceError('AI_UNAVAILABLE', 'AI generation is not configured.', 503);
      try {
        if (request.onPartial) return await generateStreaming(model, request);
        const result = await generateObject({
          model,
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
        if (error instanceof AIProviderError) throw error;
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
