import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { ProjectsService } from '@/services/projects.service.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';

export const viewProject =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res
        .status(200)
        .json({ data: await service.find(req.account!.id, req.params.projectId!) });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const listProjects =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res
        .status(200)
        .json(
          await service.list(req.account!.id, req.query as unknown as ProjectListInput),
        );
    } catch (error) {
      UserHandleError(error, next);
    }
  };

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
