import { Router } from 'express';
import * as projectsController from '@/controllers/projects.controller.js';
import { createVerifyToken } from '@/middlewares/verifyToken.js';
import { synchronizeUser } from '@/middlewares/synchronizeUser.js';
import { verifyUser } from '@/middlewares/verifyRole.js';
import { validate } from '@/middlewares/validate.js';
import { createProjectSchema } from '@/utils/input-validators/projects.js';
import type { UserService } from '@/services/user.service.js';
import type { ProjectsService } from '@/services/projects.service.js';
import type { TokenVerifier } from '@/types/auth.type.js';

export const createProjectsRouter = (
  service: ProjectsService,
  users: UserService,
  verify: TokenVerifier,
) => {
  const router = Router();
  router.use(createVerifyToken(verify), synchronizeUser(users), verifyUser);
  router.post(
    '/',
    validate('body', createProjectSchema),
    projectsController.createProject(service),
  );
  return router;
};
