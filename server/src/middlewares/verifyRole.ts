import type { Response, NextFunction } from 'express';
import type { AuthRequest, UserProfile } from '@/types/auth.type.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const verifyRole =
  (allowed: UserProfile['role'][]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.account) {
      next(new ServiceError('UNAUTHORIZED', 'Authentication is required', 401));
      return;
    }
    if (!allowed.includes(req.account.role)) {
      next(new ServiceError('FORBIDDEN', 'Access is not permitted', 403));
      return;
    }
    next();
  };

export const verifyUser = verifyRole(['USERS']);
export const verifyAdmin = verifyRole(['ADMIN']);
export const verifyStaff = verifyRole(['STAFF']);
