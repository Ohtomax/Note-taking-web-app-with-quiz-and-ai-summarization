import type { Request, Response } from 'express';
import type { SummaryContent } from '@/utils/input-validators/summaries.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export function summaryStream(req: Request, res: Response) {
  const enabled = Boolean(req.get('Accept')?.includes('text/event-stream'));
  let started = false;
  const write = (event: unknown) => {
    if (res.destroyed || res.writableEnded) return;
    if (!started) {
      started = true;
      res.status(201).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      });
    }
    res.write('data: ' + JSON.stringify(event) + '\n\n');
  };
  return {
    progress: enabled
      ? (content: SummaryContent) => write({ type: 'summary', content })
      : undefined,
    finish: (data: unknown) => {
      if (res.destroyed) return;
      if (!started) {
        res.status(201).json({ data });
        return;
      }
      write({ type: 'result', data });
      res.end();
    },
    fail: (cause: unknown) => {
      if (res.destroyed) return true;
      if (!started) return false;
      const error =
        cause instanceof ServiceError
          ? { status: cause.status, code: cause.code, message: cause.message }
          : {
              status: 500,
              code: 'INTERNAL_ERROR',
              message: 'Generation could not complete.',
            };
      write({ type: 'error', error });
      res.end();
      return true;
    },
  };
}
