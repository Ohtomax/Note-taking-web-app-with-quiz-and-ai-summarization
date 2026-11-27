import { Router } from 'express';
import * as notesController from '@/controllers/notes.controller.js';
import { createVerifyToken } from '@/middlewares/verifyToken.js';
import { synchronizeUser } from '@/middlewares/synchronizeUser.js';
import { verifyUser } from '@/middlewares/verifyRole.js';
import { validate } from '@/middlewares/validate.js';
import { createNoteSchema, noteParamsSchema } from '@/utils/input-validators/notes.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import type { UserService } from '@/services/user.service.js';
import type { NotesService } from '@/services/notes.service.js';
import type { TokenVerifier } from '@/types/auth.type.js';

export const createNotesRouter = (
  service: NotesService,
  users: UserService,
  verify: TokenVerifier,
) => {
  const router = Router({ mergeParams: true });
  router.use(createVerifyToken(verify), synchronizeUser(users), verifyUser);
  router.post(
    '/',
    validate('params', projectParamsSchema),
    validate('body', createNoteSchema),
    notesController.createNote(service),
  );
  router.get(
    '/:noteId',
    validate('params', noteParamsSchema),
    notesController.viewNote(service),
  );
  return router;
};
