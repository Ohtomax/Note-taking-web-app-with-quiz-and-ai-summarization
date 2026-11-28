import { summaryStream } from './summary-stream.js';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { SummaryGenerationService } from '@/services/summary-generation.service.js';
import {
  idempotencyKeySchema,
  type SummaryGenerationInput,
} from '@/utils/input-validators/generations.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const generateSummary =
  (service: SummaryGenerationService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const stream = summaryStream(req, res);
    try {
      const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
      if (!key.success)
        throw new ServiceError(
          'INVALID_INPUT',
          'A valid Idempotency-Key header is required.',
          400,
        );
      stream.finish(
        await service.generate(
          req.account!.id,
          req.params.projectId!,
          key.data,
          req.body as SummaryGenerationInput,
          stream.progress,
        ),
      );
    } catch (error) {
      if (stream.fail(error)) return;
      next(error);
    }
  };
export const getGeneration =
  (service: SummaryGenerationService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.get(req.account!.id, req.params.generationId!) });
    } catch (error) {
      next(error);
    }
  };
