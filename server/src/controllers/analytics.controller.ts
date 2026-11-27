import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { AnalyticsService } from '@/services/analytics.service.js';
import { analyticsQuerySchema } from '@/utils/input-validators/analytics.js';
import { quizAnalyticsQuerySchema } from '@/utils/input-validators/analytics.js';
export const globalAnalytics =
  (service: AnalyticsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.global(
          req.account!.id,
          analyticsQuerySchema.parse(req.query),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

export const projectAnalytics =
  (service: AnalyticsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.project(
          req.account!.id,
          req.params.projectId!,
          analyticsQuerySchema.parse(req.query),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

export const quizAnalytics =
  (service: AnalyticsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.quiz(
          req.account!.id,
          req.params.quizId!,
          quizAnalyticsQuerySchema.parse(req.query),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
