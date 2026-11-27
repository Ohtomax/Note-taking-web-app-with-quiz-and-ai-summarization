import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { QuizAttemptService } from '@/services/quiz-attempt.service.js';
import { startQuizAttempt } from '@/controllers/quiz-attempt.controller.js';
import { startAttemptSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
import { quizParamsSchema } from '@/utils/input-validators/saved-quizzes.js';
import { validate } from '@/middlewares/validate.js';
import { readQuizAttempt } from '@/controllers/quiz-attempt.controller.js';
import { attemptParamsSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
export function createAttemptRouter(
  services: PrivateServices,
  attempts: QuizAttemptService,
) {
  const router = createPrivateRouter(services);
  router.get(
    '/:attemptId',
    validate('params', attemptParamsSchema),
    readQuizAttempt(attempts),
  );
  return router;
}
export function createQuizStartRouter(
  services: PrivateServices,
  attempts: QuizAttemptService,
) {
  const router = createPrivateRouter(services);
  router.post(
    '/',
    validate('params', quizParamsSchema),
    validate('body', startAttemptSchema),
    startQuizAttempt(attempts),
  );
  return router;
}
