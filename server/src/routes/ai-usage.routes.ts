import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { AIUsageService } from '@/services/ai-usage.service.js';
import { listAIUsage } from '@/controllers/ai-usage.controller.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
import { validate } from '@/middlewares/validate.js';
export const createAIUsageRouter = (services: PrivateServices, usage: AIUsageService) => {
  const router = createPrivateRouter(services);
  router.get('/', validate('query', usageQuerySchema), listAIUsage(usage));
  return router;
};
