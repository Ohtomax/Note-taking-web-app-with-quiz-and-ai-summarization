import { Router } from 'express';
import * as notesController from '@/controllers/notes.controller.js';
import { createVerifyToken } from '@/middlewares/verifyToken.js';
import { synchronizeUser } from '@/middlewares/synchronizeUser.js';
import { verifyUser } from '@/middlewares/verifyRole.js';
import { validate } from '@/middlewares/validate.js';
import { createNoteSchema, noteParamsSchema } from '@/utils/input-validators/notes.js';
import { updateNoteSchema } from '@/utils/input-validators/notes.js';
import { noteListSchema } from '@/utils/input-validators/notes.js';
import { pinNoteSchema } from '@/utils/input-validators/notes.js';
import { revisionSchema } from '@/utils/input-validators/projects.js';
import { deleteNoteSchema } from '@/utils/input-validators/notes.js';
import { moveNoteSchema } from '@/utils/input-validators/notes.js';
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
    '/:noteId/move',
    validate('params', noteParamsSchema),
    validate('body', moveNoteSchema),
    notesController.moveNote(service),
  );
  router.post(
    '/:noteId/duplicate',
    validate('params', noteParamsSchema),
    validate('body', revisionSchema),
    notesController.duplicateNote(service),
  );
  router.delete(
    '/:noteId',
    validate('params', noteParamsSchema),
    validate('body', deleteNoteSchema),
    notesController.deleteNote(service),
  );
  router.post(
    '/:noteId/archive',
    validate('params', noteParamsSchema),
    validate('body', revisionSchema),
    notesController.archiveNote(service, true),
  );
  router.post(
    '/:noteId/restore',
    validate('params', noteParamsSchema),
    validate('body', revisionSchema),
    notesController.archiveNote(service, false),
  );
  router.post(
    '/:noteId/pin',
    validate('params', noteParamsSchema),
    validate('body', pinNoteSchema),
    notesController.pinNote(service),
  );
  router.get(
    '/',
    validate('params', projectParamsSchema),
    validate('query', noteListSchema),
    notesController.listNotes(service),
  );
  router.patch(
    '/:noteId',
    validate('params', noteParamsSchema),
    validate('body', updateNoteSchema),
    notesController.updateNote(service),
  );
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
