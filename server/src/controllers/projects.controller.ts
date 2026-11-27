import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { ProjectsService } from '@/services/projects.service.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';
import type { ProjectListInput } from '@/utils/input-validators/projects.js';

export const deletionPreview =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.deletionPreview(req.account!.id, req.params.projectId!),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const deleteProject =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await service.remove(
        req.account!.id,
        req.params.projectId!,
        req.body.impactRevision,
      );
      res.status(204).end();
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const archiveProject =
  (service: ProjectsService, archived: boolean) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.setArchived(
          req.account!.id,
          req.params.projectId!,
          req.body.expectedRevision,
          archived,
        ),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const updateProject =
  (service: ProjectsService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.update(req.account!.id, req.params.projectId!, req.body),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

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
