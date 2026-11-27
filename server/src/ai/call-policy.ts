import type { AIClient, AIRequest, AIResult, AIUsageCounts } from '@/ai/client.js';
import { AIProviderError } from '@/ai/client.js';
import { generationLimits } from '@/ai/chunking/plan.js';
import type { AICallRunner } from '@/services/ai.service.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export interface CallEvent {
  number: number;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNCERTAIN';
  usage: AIUsageCounts;
}
interface PolicyOptions {
  limits?: typeof generationLimits;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  observe?: (event: CallEvent) => Promise<void>;
}
export function createCallRunner(
  client: AIClient,
  options: PolicyOptions = {},
): AICallRunner {
  const limits = options.limits ?? generationLimits,
    now = options.now ?? Date.now;
  const deadline = now() + limits.deadlineMs;
  const sleep =
    options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let calls = 0;
  const unknown = { inputTokens: null, outputTokens: null };
  return {
    call: async <T>(request: AIRequest<T>): Promise<AIResult<T>> => {
      for (let attempt = 0; ; attempt++) {
        request.signal.throwIfAborted();
        if (now() >= deadline)
          throw new ServiceError(
            'AI_DEADLINE',
            'Generation deadline reached. Retrieve its status.',
            503,
          );
        const number = ++calls;
        await options.observe?.({ number, status: 'RUNNING', usage: unknown });
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let abort: () => void = () => {};
        try {
          const signal = AbortSignal.any([request.signal, controller.signal]);
          const timeout = new Promise<never>((_resolve, reject) => {
            abort = () => reject(new AIProviderError('UNCERTAIN'));
            signal.addEventListener('abort', abort, { once: true });
            timer = setTimeout(
              () => controller.abort(),
              Math.min(limits.callTimeoutMs, deadline - now()),
            );
          });
          try {
            const result = await Promise.race([
              client.generate({ ...request, signal }),
              timeout,
            ]);
            await options.observe?.({ number, status: 'SUCCEEDED', usage: result.usage });
            return result;
          } finally {
            signal.removeEventListener('abort', abort);
          }
        } catch (cause) {
          const error =
            cause instanceof AIProviderError ? cause : new AIProviderError('UNCERTAIN');
          await options.observe?.({
            number,
            status: error.kind === 'UNCERTAIN' ? 'UNCERTAIN' : 'FAILED',
            usage: error.usage,
          });
          if (error.kind !== 'TRANSIENT' || attempt >= limits.retries) throw error;
          const delay = Math.max(
            error.retryAfterMs,
            250 * 2 ** attempt + Math.floor((options.random ?? Math.random)() * 100),
          );
          if (now() + delay >= deadline)
            throw new ServiceError(
              'AI_DEADLINE',
              'Generation deadline reached. Retrieve its status.',
              503,
            );
          await sleep(delay);
        } finally {
          if (timer) clearTimeout(timer);
        }
      }
    },
  };
}
