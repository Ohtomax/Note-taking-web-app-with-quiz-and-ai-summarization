import type { Store } from 'express-rate-limit';
import { createApiLimiter, rateLimits } from './apiLimiter.js';
export const createAIGenerationLimiter = (store: Store) =>
  createApiLimiter(store, rateLimits.generation);
