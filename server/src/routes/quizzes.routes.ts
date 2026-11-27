import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { QuizzesService } from '@/services/quizzes.service.js';
import { saveQuiz, authorQuizVersion } from '@/controllers/saved-quizzes.controller.js';
import { validate } from '@/middlewares/validate.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import { saveGeneratedQuizSchema } from '@/utils/input-validators/saved-quizzes.js';
import { quizVersionParamsSchema } from '@/utils/input-validators/saved-quizzes.js';
import {
  quizParamsSchema,
  publishQuizSchema,
} from '@/utils/input-validators/saved-quizzes.js';
import { publishQuiz, regenerateQuiz } from '@/controllers/saved-quizzes.controller.js';
import { quizGenerationSchema } from '@/utils/input-validators/quizzes.js';
import {
  quizLibraryQuerySchema,
  renameQuizSchema,
  duplicateQuizSchema,
} from '@/utils/input-validators/saved-quizzes.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
import { confirmDeleteSchema } from '@/utils/input-validators/saved-artifacts.js';
import {
  listQuizzes,
  quizVersions,
  findQuiz,
  renameQuiz,
  removeQuiz,
  duplicateQuiz,
} from '@/controllers/saved-quizzes.controller.js';
export function createProjectQuizRouter(
  services: PrivateServices,
  quizzes: QuizzesService,
) {
  const router = createPrivateRouter(services);
  router.get(
    '/',
    validate('params', projectParamsSchema),
    validate('query', quizLibraryQuerySchema),
    listQuizzes(quizzes),
  );
  router.post(
    '/',
    validate('params', projectParamsSchema),
    validate('body', saveGeneratedQuizSchema),
    saveQuiz(quizzes),
  );
  return router;
}
export function createQuizRouter(services: PrivateServices, quizzes: QuizzesService) {
  const router = createPrivateRouter(services);
  router.get('/:quizId', validate('params', quizParamsSchema), findQuiz(quizzes));
  router.get(
    '/:quizId/versions',
    validate('params', quizParamsSchema),
    validate('query', usageQuerySchema),
    quizVersions(quizzes),
  );
  router.patch(
    '/:quizId',
    validate('params', quizParamsSchema),
    validate('body', renameQuizSchema),
    renameQuiz(quizzes),
  );
  router.delete(
    '/:quizId',
    validate('params', quizParamsSchema),
    validate('body', confirmDeleteSchema),
    removeQuiz(quizzes),
  );
  router.post(
    '/:quizId/duplicate',
    validate('params', quizParamsSchema),
    validate('body', duplicateQuizSchema),
    duplicateQuiz(quizzes),
  );
  router.post(
    '/:quizId/versions',
    validate('params', quizParamsSchema),
    validate('body', publishQuizSchema),
    publishQuiz(quizzes),
  );
  router.post(
    '/:quizId/regenerate',
    validate('params', quizParamsSchema),
    validate('body', quizGenerationSchema),
    regenerateQuiz(quizzes),
  );
  router.get(
    '/:quizId/versions/:versionId/authoring',
    validate('params', quizVersionParamsSchema),
    authorQuizVersion(quizzes),
  );
  return router;
}
