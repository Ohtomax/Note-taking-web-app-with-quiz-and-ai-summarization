import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';

const tokenMetadata = z.object({
  usageMetadata: z.object({
    promptTokenCount: z.number().int().nonnegative(),
    totalTokenCount: z.number().int().nonnegative(),
  }),
});

export const streamUsage = new AsyncLocalStorage<{ input?: number; total?: number }>();

export function observeGeminiStream(transport: typeof fetch = fetch): typeof fetch {
  return async (url, init) => {
    const meter = streamUsage.getStore();
    const response = await transport(url, init);
    if (
      !meter ||
      !response.ok ||
      !response.body ||
      !response.headers.get('content-type')?.includes('text/event-stream')
    )
      return response;

    const decoder = new TextDecoder();
    let line = '';
    let skipping = false;
    const readLine = () => {
      if (skipping || !line.startsWith('data:') || !line.includes('"usageMetadata"'))
        return;
      try {
        const parsed = tokenMetadata.safeParse(JSON.parse(line.slice(5)));
        if (parsed.success) {
          meter.input = parsed.data.usageMetadata.promptTokenCount;
          meter.total = parsed.data.usageMetadata.totalTokenCount;
        }
      } catch {
        // Missing usage is charged at the existing conservative reservation.
      }
    };
    const body = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const lines = decoder.decode(chunk, { stream: true }).split('\n');
          for (const [index, part] of lines.entries()) {
            if (!skipping) {
              if (line.length + part.length <= 262_144) line += part;
              else skipping = true;
            }
            if (index < lines.length - 1) {
              readLine();
              line = '';
              skipping = false;
            }
          }
          controller.enqueue(chunk);
        },
        flush() {
          if (!skipping) line += decoder.decode();
          readLine();
        },
      }),
    );
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
