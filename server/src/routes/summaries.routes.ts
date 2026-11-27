import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { SummaryGenerationService } from '@/services/summary-generation.service.js';
import { generateSummary, getGeneration } from '@/controllers/summaries.controller.js';
import {
  generationParamsSchema,
  summaryGenerationSchema,
} from '@/utils/input-validators/generations.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import { validate } from '@/middlewares/validate.js';
export function createSummaryGenerationRouter(
  services: PrivateServices,
  summary: SummaryGenerationService,
) {
  const router = createPrivateRouter(services);
  router.post(
    '/',
    validate('params', projectParamsSchema),
    validate('body', summaryGenerationSchema),
    generateSummary(summary),
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
