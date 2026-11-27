import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { QuizAttemptService } from '@/services/quiz-attempt.service.js';
import { startQuizAttempt } from '@/controllers/quiz-attempt.controller.js';
import { startAttemptSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
import { quizParamsSchema } from '@/utils/input-validators/saved-quizzes.js';
import { validate } from '@/middlewares/validate.js';
import { readQuizAttempt } from '@/controllers/quiz-attempt.controller.js';
import { attemptParamsSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
import {
  answerParamsSchema,
  answerInputSchema,
} from '@/utils/input-validators/quiz-attempt.validator.js';
import { saveAttemptAnswer } from '@/controllers/quiz-attempt.controller.js';
import { submitQuizAttempt } from '@/controllers/quiz-attempt.controller.js';
import { emptyActionSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
import {
  openQuizAttempts,
  locateQuizAttempt,
  abandonQuizAttempt,
} from '@/controllers/quiz-attempt.controller.js';
import {
  locationSchema,
  openAttemptQuerySchema,
} from '@/utils/input-validators/quiz-attempt.validator.js';
import { confirmDeleteSchema } from '@/utils/input-validators/saved-artifacts.js';
import { quizAttemptResults } from '@/controllers/quiz-attempt.controller.js';
export function createAttemptRouter(
  services: PrivateServices,
  attempts: QuizAttemptService,
) {
  const router = createPrivateRouter(services);
  router.get(
    '/:attemptId/results',
    validate('params', attemptParamsSchema),
    quizAttemptResults(attempts),
  );
  router.get(
    '/in-progress',
    validate('query', openAttemptQuerySchema),
    openQuizAttempts(attempts),
  );
  router.patch(
    '/:attemptId/location',
    validate('params', attemptParamsSchema),
    validate('body', locationSchema),
    locateQuizAttempt(attempts),
  );
  router.post(
    '/:attemptId/abandon',
    validate('params', attemptParamsSchema),
    validate('body', confirmDeleteSchema),
    abandonQuizAttempt(attempts),
  );
  router.post(
    '/:attemptId/submit',
    validate('params', attemptParamsSchema),
    validate('body', emptyActionSchema),
    submitQuizAttempt(attempts),
  );
  router.put(
    '/:attemptId/answers/:questionId',
    validate('params', answerParamsSchema),
    validate('body', answerInputSchema),
    saveAttemptAnswer(attempts),
  );
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
