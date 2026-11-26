import type { NextFunction } from 'express';
import { Prisma } from '@/generated/prisma/client.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const UserHandleError = (error: unknown, next: NextFunction): void => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    next(new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404));
    return;
  }
  next(error);
};
