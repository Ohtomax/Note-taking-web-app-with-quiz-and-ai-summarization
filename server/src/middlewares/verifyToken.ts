import type { Response, NextFunction } from 'express';
import type { AuthRequest, TokenVerifier } from '@/types/auth.type.js';
import {
  authorizationSchema,
  verifiedIdentitySchema,
} from '@/utils/input-validators/auth.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const createVerifyToken =
  (verify: TokenVerifier) =>
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    const header = authorizationSchema.safeParse(req.headers.authorization);
    if (!header.success) {
      next(new ServiceError('UNAUTHORIZED', 'Authentication is required', 401));
      return;
    }
    try {
      const identity = verifiedIdentitySchema.parse(await verify(header.data.slice(7)));
      req.user = {
        uid: identity.uid,
        ...(identity.email ? { email: identity.email } : {}),
        ...(identity.name ? { name: identity.name } : {}),
      };
      next();
    } catch (error) {
      if (error instanceof ServiceError && error.status === 503) {
        next(error);
        return;
      }
      next(new ServiceError('UNAUTHORIZED', 'Invalid authentication token', 401));
    }
  };
