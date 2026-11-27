import type { NextFunction } from 'express';
import { ZodError } from 'zod';
import { ServiceError } from './ServiceError.js';
export function AIHandleError(error: unknown, next: NextFunction) {
  if (error instanceof ZodError) {
    next(
      new ServiceError(
        'INVALID_ARTIFACT',
        'Generated or edited content is invalid.',
        422,
      ),
    );
    return;
  }
  next(error);
}
