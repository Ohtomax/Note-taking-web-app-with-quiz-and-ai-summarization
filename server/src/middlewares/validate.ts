import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const validate =
  (target: 'body' | 'params' | 'query', schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new ServiceError('INVALID_INPUT', 'Invalid request input', 400));
      return;
    }
    req[target] = result.data;
    next();
  };
