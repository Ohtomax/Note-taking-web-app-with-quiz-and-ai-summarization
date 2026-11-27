import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { AnalyticsService } from '@/services/analytics.service.js';
import { globalAnalytics } from '@/controllers/analytics.controller.js';
import { analyticsQuerySchema } from '@/utils/input-validators/analytics.js';
import { validate } from '@/middlewares/validate.js';
export function createAnalyticsRouter(
  services: PrivateServices,
  analytics: AnalyticsService,
) {
  const router = createPrivateRouter(services);
  router.get('/', validate('query', analyticsQuerySchema), globalAnalytics(analytics));
  return router;
}
