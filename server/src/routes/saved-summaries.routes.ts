import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import { validate } from '@/middlewares/validate.js';
import { projectParamsSchema } from '@/utils/input-validators/projects.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
import {
  saveGenerationSchema,
  summaryParamsSchema,
} from '@/utils/input-validators/saved-artifacts.js';
import {
  saveSummary,
  findSummary,
  listSummaries,
} from '@/controllers/saved-summaries.controller.js';
import type { SummariesService } from '@/services/summaries.service.js';
export function createSavedSummaryRouter(
  services: PrivateServices,
  summaries: SummariesService,
) {
  const router = createPrivateRouter(services);
  router.use(validate('params', projectParamsSchema));
  router.post('/', validate('body', saveGenerationSchema), saveSummary(summaries));
  router.get('/', validate('query', usageQuerySchema), listSummaries(summaries));
  return router;
}
export function createSummaryDetailRouter(
  services: PrivateServices,
  summaries: SummariesService,
) {
  const router = createPrivateRouter(services);
  router.use('/:summaryId', validate('params', summaryParamsSchema));
  router.get('/:summaryId', findSummary(summaries));
  return router;
}
