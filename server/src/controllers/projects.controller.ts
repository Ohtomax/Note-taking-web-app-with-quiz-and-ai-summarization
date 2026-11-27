import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { ProjectsService } from '@/services/projects.service.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';

export const createProject =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await service.create(req.account!.id, req.body);
      res.status(201).json({ data: project, message: 'Project created successfully' });
    } catch (error) {
      UserHandleError(error, next);
    }
  };
