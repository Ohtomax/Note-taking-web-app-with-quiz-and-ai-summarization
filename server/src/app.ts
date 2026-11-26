import express from 'express';
import { createHealthRouter, type ReadinessCheck } from '@/routes/health.routes.js';

export function createApp(checkReadiness: ReadinessCheck = async () => false) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/health', createHealthRouter(checkReadiness));
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
  return app;
}
