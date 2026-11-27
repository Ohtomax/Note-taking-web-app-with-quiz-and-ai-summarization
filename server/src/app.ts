import express from 'express';
import {
  createDashboardRouter,
  createNoteOpenRouter,
} from '@/routes/dashboard.routes.js';
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
import {
  createAnalyticsRouter,
  createProjectAnalyticsRouter,
  createQuizAnalyticsRouter,
} from '@/routes/analytics.routes.js';
import {
  createQuizStartRouter,
  createAttemptRouter,
} from '@/routes/quiz-attempt.routes.js';
import { createProjectQuizRouter, createQuizRouter } from '@/routes/quizzes.routes.js';
import {
  createSavedSummaryRouter,
  createSummaryDetailRouter,
} from '@/routes/saved-summaries.routes.js';
import type { AIUsageService } from '@/services/ai-usage.service.js';
import { createAIUsageRouter } from '@/routes/ai-usage.routes.js';
import type { SummaryGenerationService } from '@/services/summary-generation.service.js';
import {
  createSummaryGenerationRouter,
  createGenerationStatusRouter,
} from '@/routes/summaries.routes.js';

export interface AppServices {
  dashboardService?: import('@/services/dashboard.service.js').DashboardService;
  analyticsService?: import('@/services/analytics.service.js').AnalyticsService;
  quizHistoryService?: import('@/services/quiz-history.service.js').QuizHistoryService;
  quizAttemptService?: import('@/services/quiz-attempt.service.js').QuizAttemptService;
  quizzesService?: import('@/services/quizzes.service.js').QuizzesService;
  quizGenerationService?: import('@/services/quiz-generation.service.js').QuizGenerationService;
  summariesService?: import('@/services/summaries.service.js').SummariesService;
  summaryGenerationService?: SummaryGenerationService;
  aiLimiter?: RequestHandler;
  aiUsageService?: AIUsageService;
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
    if (services.dashboardService) {
      app.use(
        '/api/v1/dashboard',
        createDashboardRouter(services, services.dashboardService),
      );
      app.use(
        '/api/v1/projects/:projectId/notes/:noteId/open',
        createNoteOpenRouter(services, services.dashboardService),
      );
    }
    if (services.analyticsService)
      app.use(
        '/api/v1/quizzes/:quizId/analytics',
        createQuizAnalyticsRouter(services, services.analyticsService),
      );
    if (services.analyticsService)
      app.use(
        '/api/v1/projects/:projectId/analytics',
        createProjectAnalyticsRouter(services, services.analyticsService),
      );
    if (services.analyticsService)
      app.use(
        '/api/v1/analytics',
        createAnalyticsRouter(services, services.analyticsService),
      );
    if (services.quizAttemptService)
      app.use(
        '/api/v1/attempts',
        createAttemptRouter(
          services,
          services.quizAttemptService,
          services.quizHistoryService,
        ),
      );
    if (services.quizAttemptService)
      app.use(
        '/api/v1/quizzes/:quizId/attempts',
        createQuizStartRouter(services, services.quizAttemptService),
      );
    if (services.quizzesService) {
      app.use(
        '/api/v1/quizzes/:quizId/regenerate',
        services.aiLimiter ??
          ((_req, _res, next) =>
            next(
              new ServiceError(
                'AI_UNAVAILABLE',
                'Generation admission is unavailable.',
                503,
              ),
            )),
      );
      app.use(
        '/api/v1/projects/:projectId/quizzes',
        createProjectQuizRouter(services, services.quizzesService),
      );
      app.use('/api/v1/quizzes', createQuizRouter(services, services.quizzesService));
    }
    if (services.summariesService) {
      app.use(
        '/api/v1/summaries/:summaryId/regenerate',
        services.aiLimiter ??
          ((_req, _res, next) =>
            next(
              new ServiceError(
                'AI_UNAVAILABLE',
                'Generation admission is unavailable.',
                503,
              ),
            )),
      );
      app.use(
        '/api/v1/projects/:projectId/summaries',
        createSavedSummaryRouter(services, services.summariesService),
      );
      app.use(
        '/api/v1/summaries',
        createSummaryDetailRouter(services, services.summariesService),
      );
    }
    if (services.summaryGenerationService) {
      app.use(
        '/api/v1/projects/:projectId/generations',
        services.aiLimiter ??
          ((_req, _res, next) =>
            next(
              new ServiceError(
                'AI_UNAVAILABLE',
                'Generation admission is unavailable.',
                503,
              ),
            )),
        createSummaryGenerationRouter(
          services,
          services.summaryGenerationService,
          services.quizGenerationService,
        ),
      );
      app.use(
        '/api/v1/generations',
        createGenerationStatusRouter(services, services.summaryGenerationService),
      );
    }
    if (services.aiUsageService)
      app.use('/api/v1/ai-usage', createAIUsageRouter(services, services.aiUsageService));
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
