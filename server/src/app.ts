import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseEnvironment, type Environment } from '../config/env.ts';
import { ApiHandleError } from '@/utils/error-handler/apiErrorHandler.js';
import { createHealthRouter, type ReadinessCheck } from '@/routes/health.routes.js';
import { requestLogger } from '@/middlewares/requestLogger.js';
import type { LogWriter } from '@/utils/logger.js';
import type { RequestHandler } from 'express';
import type { TokenVerifier } from '@/types/auth.type.js';
import type { UserService } from '@/services/user.service.js';
import { createUserRouter } from '@/routes/user.routes.js';
import { createProjectsRouter } from '@/routes/projects.routes.js';
import type { ProjectsService } from '@/services/projects.service.js';
import type { NotesService } from '@/services/notes.service.js';
import { createNotesRouter } from '@/routes/notes.routes.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';

export interface AppServices {
  notesService?: NotesService;
  projectsService?: ProjectsService;
  userService: UserService;
  verifyToken: TokenVerifier;
  rateLimiter: RequestHandler;
}

export function createApp(
  checkReadiness: ReadinessCheck = async () => false,
  environment: Environment = parseEnvironment({}),
  logWriter?: LogWriter,
  services?: AppServices,
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger(logWriter));
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
  app.use(
    '/api/v1',
    services?.rateLimiter ??
      ((_req, _res, next) => {
        next(new ServiceError('SERVICE_UNAVAILABLE', 'Service is unavailable', 503));
      }),
  );
  if (services) {
    if (services.notesService)
      app.use(
        '/api/v1/projects/:projectId/notes',
        createNotesRouter(
          services.notesService,
          services.userService,
          services.verifyToken,
        ),
      );
    app.use('/api/v1/me', createUserRouter(services.userService, services.verifyToken));
    if (services.projectsService)
      app.use(
        '/api/v1/projects',
        createProjectsRouter(
          services.projectsService,
          services.userService,
          services.verifyToken,
        ),
      );
  }
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
      requestId: response.locals.requestId,
    });
  });
  app.use(ApiHandleError);
  return app;
}
