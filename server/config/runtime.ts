import { deleteApp } from 'firebase-admin/app';
import { createDatabase } from './db.ts';
import { createFirebaseVerifier } from './firebase.ts';
import { createRedis } from './redis.ts';
import type { Environment } from './env.ts';
import {
  createApiLimiter,
  createRedisStore,
  rateLimits,
} from '@/utils/rate-limiter/apiLimiter.js';
import { createUserRepository } from '@/repositories/user.repository.js';
import { createUserService } from '@/services/user.service.js';
import type { AppServices } from '@/app.js';
import { createProjectsRepository } from '@/repositories/projects.repository.js';
import { createProjectsService } from '@/services/projects.service.js';
import { createNotesService } from '@/services/notes.service.js';
import { createNotesRepository } from '@/repositories/notes.repository.js';
import { createStudyServices } from './ai.ts';
import { createAIClient } from '@/ai/client.js';
import { parseAIConfig } from '@/ai/config.js';
import { createAIGenerationLimiter } from '@/utils/rate-limiter/ai.js';
import { quotaPolicy } from '@/repositories/ai-admission.repository.js';

export const createRuntime = async (environment: Environment) => {
  const firebase = createFirebaseVerifier(environment);
  const database =
    environment.DATABASE_URL && environment.DATABASE_CA_PATH
      ? createDatabase(
          environment.DATABASE_URL,
          environment.DATABASE_CA_PATH,
          environment.DB_POOL_MAX,
        )
      : undefined;
  const redis = environment.REDIS_URL ? createRedis(environment.REDIS_URL) : undefined;
  if (redis) {
    await redis.connect().catch(() => {});
  }
  let services: AppServices | undefined;
  if (database && firebase.app && redis?.status === 'ready') {
    services = {
      ...createStudyServices(
        database,
        createAIClient(
          parseAIConfig({
            enabled: environment.AI_ENABLED,
            apiKey: environment.AI_API_KEY,
            model: environment.AI_MODEL,
          }),
        ),
        {
          quota: {
            ...quotaPolicy,
            globalConcurrency: environment.AI_GLOBAL_CONCURRENCY,
          },
        },
      ),
      aiLimiter: createAIGenerationLimiter(createRedisStore(redis, 'generation')),
      notesService: createNotesService(createNotesRepository(database)),
      projectsService: createProjectsService(createProjectsRepository(database)),
      userService: createUserService(createUserRepository(database)),
      verifyToken: firebase.verify,
      rateLimiter: createApiLimiter(
        createRedisStore(redis, 'profile'),
        rateLimits.profile,
      ),
    };
  }
  return {
    services,
    checkReadiness: async () => {
      if (!services || !database || !redis || redis.status !== 'ready') return false;
      await redis.ping();
      await database.user.findFirst({ select: { id: true } });
      return true;
    },
    close: async () => {
      redis?.disconnect();
      await database?.$disconnect();
      if (firebase.app) await deleteApp(firebase.app);
    },
  };
};
