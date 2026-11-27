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
import {
  updateSummary,
  removeSummary,
  regenerateSummary,
} from '@/controllers/saved-summaries.controller.js';
import { updateSummarySchema } from '@/utils/input-validators/summaries.js';
import { confirmDeleteSchema } from '@/utils/input-validators/saved-artifacts.js';
import { summaryGenerationSchema } from '@/utils/input-validators/generations.js';
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
  router.patch(
    '/:summaryId',
    validate('body', updateSummarySchema),
    updateSummary(summaries),
  );
  router.delete(
    '/:summaryId',
    validate('body', confirmDeleteSchema),
    removeSummary(summaries),
  );
  router.post(
    '/:summaryId/regenerate',
    validate('params', summaryParamsSchema),
    validate('body', summaryGenerationSchema),
    regenerateSummary(summaries),
  );
  return router;
}
