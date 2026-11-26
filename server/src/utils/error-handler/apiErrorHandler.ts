import type { ErrorRequestHandler } from 'express';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const ApiHandleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) return;
  const requestId = res.locals.requestId as string | undefined;
  if (error instanceof ServiceError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message }, requestId });
    return;
  }
  const bodyError = error as { type?: unknown };
  if (bodyError?.type === 'entity.too.large') {
    res
      .status(413)
      .json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large' } });
    return;
  }
  if (bodyError?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
    return;
  }
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    requestId,
  });
};
