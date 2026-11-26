import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { UserService } from '@/services/user.service.js';
import type { UpdateProfileInput } from '@/utils/input-validators/user.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';

export const viewProfile = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.account) {
    next(new ServiceError('UNAUTHORIZED', 'Authentication is required', 401));
    return;
  }
  res.status(200).json({ data: req.account });
};

export const updateProfile =
  (service: UserService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.account)
        throw new ServiceError('UNAUTHORIZED', 'Authentication is required', 401);
      const data = req.body as UpdateProfileInput;
      const profile = await service.updateProfile(req.account.id, data.displayName);
      res.status(200).json({ data: profile, message: 'Profile updated successfully' });
    } catch (error) {
      UserHandleError(error, next);
    }
  };
