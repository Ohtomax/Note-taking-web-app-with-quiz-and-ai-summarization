import { Router } from 'express';
import type { TokenVerifier } from '@/types/auth.type.js';
import type { UserService } from '@/services/user.service.js';
import { createVerifyToken } from '@/middlewares/verifyToken.js';
import { synchronizeUser } from '@/middlewares/synchronizeUser.js';
import { verifyUser } from '@/middlewares/verifyRole.js';
export interface PrivateServices {
  userService: UserService;
  verifyToken: TokenVerifier;
}
export const createPrivateRouter = (services: PrivateServices) => {
  const router = Router({ mergeParams: true });
  router.use(
    createVerifyToken(services.verifyToken),
    synchronizeUser(services.userService),
    verifyUser,
  );
  return router;
};
