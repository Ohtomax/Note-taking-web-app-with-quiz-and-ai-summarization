import { z } from 'zod';
import { apiRequest, ApiError } from './client';
import {
  generationResponseSchema,
  summaryContentSchema,
  type SummaryContent,
} from '@/types/study';
import type { GenerateInput } from './study';

const streamEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('summary'), content: summaryContentSchema }),
  z.object({ type: z.literal('result'), data: generationResponseSchema.shape.data }),
  z.object({
    type: z.literal('error'),
    error: z.object({ status: z.number(), code: z.string(), message: z.string() }),
  }),
]);

export async function requestSummary(
  path: string,
  key: string,
  input: GenerateInput,
  onSummary?: (content: SummaryContent) => void,
) {
  let consumed = 0;
  let final: z.infer<typeof generationResponseSchema> | undefined;
  let failure: ApiError | undefined;
  const read = (text: string) => {
    let boundary = text.indexOf('\n\n', consumed);
    while (boundary >= 0) {
      const frame = text.slice(consumed, boundary);
      consumed = boundary + 2;
      if (frame.startsWith('data: ')) {
        let candidate: unknown;
        try {
          candidate = JSON.parse(frame.slice(6));
        } catch {
          break;
        }
        const result = streamEvent.safeParse(candidate);
        if (result.success) {
          const event = result.data;
          if (event.type === 'summary') onSummary?.(event.content);
          if (event.type === 'result') final = { data: event.data };
          if (event.type === 'error')
            failure = new ApiError(
              event.error.status,
              event.error.code,
              event.error.message,
            );
        }
      }
      boundary = text.indexOf('\n\n', consumed);
    }
  };

  const response = await apiRequest<unknown>(path, {
    method: 'POST',
    headers: { 'Idempotency-Key': key, Accept: 'text/event-stream, application/json' },
    body: JSON.stringify(input),
    timeoutMs: 65_000,
    onTextProgress: read,
  });
  if (typeof response !== 'string') return generationResponseSchema.parse(response);
  read(response);
  if (failure) throw failure;
  if (!final)
    throw new ApiError(
      502,
      'AI_STREAM_INTERRUPTED',
      'The generation connection ended early.',
    );
  return final;
}
