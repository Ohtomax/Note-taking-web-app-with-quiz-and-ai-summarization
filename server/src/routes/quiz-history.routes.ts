import type { Router } from 'express';
import type { QuizHistoryService } from '@/services/quiz-history.service.js';
import { listQuizHistory } from '@/controllers/quiz-history.controller.js';
import { quizHistoryQuerySchema } from '@/utils/input-validators/quiz-history.js';
import { validate } from '@/middlewares/validate.js';
import { compareQuizAttempts } from '@/controllers/quiz-history.controller.js';
import { attemptParamsSchema } from '@/utils/input-validators/quiz-attempt.validator.js';
// Attached to the already authenticated attempt router.
export function attachQuizHistoryRoutes(router: Router, service: QuizHistoryService) {
  router.get(
    '/:attemptId/comparison',
    validate('params', attemptParamsSchema),
    compareQuizAttempts(service),
  );
  router.get('/', validate('query', quizHistoryQuerySchema), listQuizHistory(service));
}
