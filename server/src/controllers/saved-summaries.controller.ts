import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { SummariesService } from '@/services/summaries.service.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
import { AIHandleError } from '@/utils/error-handler/aiErrorHandler.js';
import {
  idempotencyKeySchema,
  type SummaryGenerationInput,
} from '@/utils/input-validators/generations.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const saveSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        data: await service.save(
          req.account!.id,
          req.params.projectId!,
          req.body.generationId as string,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
export const findSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.find(req.account!.id, req.params.summaryId!) });
    } catch (error) {
      next(error);
    }
  };
export const listSummaries =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = usageQuerySchema.parse(req.query);
      res.json(
        await service.list(
          req.account!.id,
          req.params.projectId!,
          query.page,
          query.pageSize,
        ),
      );
    } catch (error) {
      next(error);
    }
  };

export const updateSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.update(
          req.account!.id,
          req.params.summaryId!,
          req.body as import('@/utils/input-validators/summaries.js').UpdateSummaryInput,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const removeSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await service.remove(req.account!.id, req.params.summaryId!);
      res.status(204).end();
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const regenerateSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
      if (!key.success)
        throw new ServiceError(
          'INVALID_INPUT',
          'A valid Idempotency-Key header is required.',
          400,
        );
      res
        .status(201)
        .json({
          data: await service.regenerate(
            req.account!.id,
            req.params.summaryId!,
            key.data,
            req.body as SummaryGenerationInput,
          ),
        });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
