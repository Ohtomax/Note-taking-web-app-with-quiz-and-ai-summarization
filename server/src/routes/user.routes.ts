import { Router } from 'express';
import * as userController from '@/controllers/user.controller.js';
import { createVerifyToken } from '@/middlewares/verifyToken.js';
import { synchronizeUser } from '@/middlewares/synchronizeUser.js';
import { verifyUser } from '@/middlewares/verifyRole.js';
import { validate } from '@/middlewares/validate.js';
import { updateProfileSchema } from '@/utils/input-validators/user.js';
import type { UserService } from '@/services/user.service.js';
import type { TokenVerifier } from '@/types/auth.type.js';

export const createUserRouter = (service: UserService, verify: TokenVerifier) => {
  const router = Router();
  router.use(createVerifyToken(verify), synchronizeUser(service), verifyUser);
  router.get('/', userController.viewProfile);
  router.patch(
    '/',
    validate('body', updateProfileSchema),
    userController.updateProfile(service),
  );
  return router;
};
