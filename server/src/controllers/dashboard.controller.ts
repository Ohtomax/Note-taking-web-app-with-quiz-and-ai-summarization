import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { DashboardService } from '@/services/dashboard.service.js';
export const dashboard =
  (service: DashboardService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.read(req.account!.id) });
    } catch (error) {
      next(error);
    }
  };
export const openNote =
  (service: DashboardService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.open(
          req.account!.id,
          req.params.projectId!,
          req.params.noteId!,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
