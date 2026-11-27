import { createPrivateRouter, type PrivateServices } from './privateRouter.js';
import type { DashboardService } from '@/services/dashboard.service.js';
import { dashboard, openNote } from '@/controllers/dashboard.controller.js';
import { validate } from '@/middlewares/validate.js';
import {
  dashboardQuerySchema,
  openNoteParamsSchema,
  openNoteInputSchema,
} from '@/utils/input-validators/dashboard.js';
export function createDashboardRouter(
  services: PrivateServices,
  service: DashboardService,
) {
  const router = createPrivateRouter(services);
  router.get('/', validate('query', dashboardQuerySchema), dashboard(service));
  return router;
}
export function createNoteOpenRouter(
  services: PrivateServices,
  service: DashboardService,
) {
  const router = createPrivateRouter(services);
  router.post(
    '/',
    validate('params', openNoteParamsSchema),
    validate('query', dashboardQuerySchema),
    validate('body', openNoteInputSchema),
    openNote(service),
  );
  return router;
}
