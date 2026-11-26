import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { UserService } from '@/services/user.service.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export const synchronizeUser =
  (service: UserService) =>
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user)
        throw new ServiceError('UNAUTHORIZED', 'Authentication is required', 401);
      req.account = await service.synchronize(req.user);
      next();
    } catch (error) {
      next(error);
    }
  };
