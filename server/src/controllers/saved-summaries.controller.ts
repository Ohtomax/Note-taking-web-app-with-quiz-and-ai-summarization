import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { SummariesService } from '@/services/summaries.service.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
export const saveSummary =
  (service: SummariesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res
        .status(201)
        .json({
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
