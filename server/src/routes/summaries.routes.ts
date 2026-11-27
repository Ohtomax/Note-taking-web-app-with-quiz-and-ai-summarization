import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { SummaryGenerationService } from '@/services/summary-generation.service.js';
import { generateSummary, getGeneration } from '@/controllers/summaries.controller.js';
import { generationParamsSchema } from '@/utils/input-validators/generations.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import { validate } from '@/middlewares/validate.js';
import { generationRequestSchema } from '@/utils/input-validators/generations.js';
import type { QuizGenerationService } from '@/services/quiz-generation.service.js';
import { generateQuiz } from '@/controllers/quizzes.controller.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export function createSummaryGenerationRouter(
  services: PrivateServices,
  summary: SummaryGenerationService,
  quiz?: QuizGenerationService,
) {
  const router = createPrivateRouter(services);
  router.post(
    '/',
    validate('params', projectParamsSchema),
    validate('body', generationRequestSchema),
    (req, res, next) =>
      req.body.operation === 'SUMMARY'
        ? generateSummary(summary)(req, res, next)
        : quiz
          ? generateQuiz(quiz)(req, res, next)
          : next(
              new ServiceError('AI_UNAVAILABLE', 'Quiz generation is unavailable.', 503),
            ),
  );
  return router;
}
export function createGenerationStatusRouter(
  services: PrivateServices,
  summary: SummaryGenerationService,
) {
  const router = createPrivateRouter(services);
  router.get(
    '/:generationId',
    validate('params', generationParamsSchema),
    getGeneration(summary),
  );
  return router;
}
