import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { QuizzesService } from '@/services/quizzes.service.js';
import { saveQuiz, authorQuizVersion } from '@/controllers/saved-quizzes.controller.js';
import { validate } from '@/middlewares/validate.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import { saveGenerationSchema } from '@/utils/input-validators/saved-artifacts.js';
import { quizVersionParamsSchema } from '@/utils/input-validators/saved-quizzes.js';
import {
  quizParamsSchema,
  publishQuizSchema,
} from '@/utils/input-validators/saved-quizzes.js';
import { publishQuiz, regenerateQuiz } from '@/controllers/saved-quizzes.controller.js';
import { quizGenerationSchema } from '@/utils/input-validators/quizzes.js';
export function createProjectQuizRouter(
  services: PrivateServices,
  quizzes: QuizzesService,
) {
  const router = createPrivateRouter(services);
  router.post(
    '/',
    validate('params', projectParamsSchema),
    validate('body', saveGenerationSchema),
    saveQuiz(quizzes),
  );
  return router;
}
export function createQuizRouter(services: PrivateServices, quizzes: QuizzesService) {
  const router = createPrivateRouter(services);
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
