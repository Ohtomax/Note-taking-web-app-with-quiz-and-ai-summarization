import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { NotesService } from '@/services/notes.service.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';

export const updateNote =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.update(
          req.account!.id,
          req.params.projectId!,
          req.params.noteId!,
          req.body,
        ),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const createNote =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({
        data: await service.create(req.account!.id, req.params.projectId!, req.body),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const viewNote =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.find(
          req.account!.id,
          req.params.projectId!,
          req.params.noteId!,
        ),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };
