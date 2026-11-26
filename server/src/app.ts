import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseEnvironment, type Environment } from '../config/env.ts';
import { ApiHandleError } from '@/utils/error-handler/apiErrorHandler.js';
import { createHealthRouter, type ReadinessCheck } from '@/routes/health.routes.js';

export function createApp(
  checkReadiness: ReadinessCheck = async () => false,
  environment: Environment = parseEnvironment({}),
) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', environment.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, !origin || environment.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use('/api/health', createHealthRouter(checkReadiness));
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
  app.use(ApiHandleError);
  return app;
}
