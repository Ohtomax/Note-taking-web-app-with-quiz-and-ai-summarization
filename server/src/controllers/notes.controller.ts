import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { NotesService } from '@/services/notes.service.js';
import { UserHandleError } from '@/utils/error-handler/userErrorHandler.js';
import type { NoteListInput } from '@/utils/input-validators/notes.js';

export const deleteNote =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await service.remove(
        req.account!.id,
        req.params.projectId!,
        req.params.noteId!,
        req.body.expectedRevision,
      );
      res.status(204).end();
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const archiveNote =
  (service: NotesService, archived: boolean) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.setArchived(
          req.account!.id,
          req.params.projectId!,
          req.params.noteId!,
          req.body.expectedRevision,
          archived,
        ),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const pinNote =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        data: await service.setPinned(
          req.account!.id,
          req.params.projectId!,
          req.params.noteId!,
          req.body.expectedRevision,
          req.body.pinned,
        ),
      });
    } catch (error) {
      UserHandleError(error, next);
    }
  };

export const listNotes =
  (service: NotesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res
        .status(200)
        .json(
          await service.list(
            req.account!.id,
            req.params.projectId!,
            req.query as unknown as NoteListInput,
          ),
        );
    } catch (error) {
      UserHandleError(error, next);
    }
  };

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
