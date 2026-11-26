import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { writeLog, type LogWriter } from '@/utils/logger.js';

export const requestLogger =
  (write: LogWriter = writeLog): RequestHandler =>
  (req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      write({
        event: res.statusCode >= 500 ? 'request_failed' : 'request_finished',
        requestId,
        method: req.method,
        status: res.statusCode,
      });
    });
    next();
  };
