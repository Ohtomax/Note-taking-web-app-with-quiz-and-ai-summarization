import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { AIUsageService } from '@/services/ai-usage.service.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
export const listAIUsage =
  (service: AIUsageService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = usageQuerySchema.parse(req.query);
      res.json(await service.list(req.account!.id, query.page, query.pageSize));
    } catch (error) {
      next(error);
    }
  };
