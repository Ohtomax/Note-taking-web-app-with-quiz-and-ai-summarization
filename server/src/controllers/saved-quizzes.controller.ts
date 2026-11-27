import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizzesService } from '@/services/quizzes.service.js';
import { AIHandleError } from '@/utils/error-handler/aiErrorHandler.js';
import type { PublishQuizInput } from '@/utils/input-validators/saved-quizzes.js';
import { idempotencyKeySchema } from '@/utils/input-validators/generations.js';
import type { QuizGenerationInput } from '@/utils/input-validators/quizzes.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import { quizLibraryQuerySchema } from '@/utils/input-validators/saved-quizzes.js';
import { usageQuerySchema } from '@/utils/input-validators/ai-usage.js';
export const saveQuiz =
  (service: QuizzesService) =>
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
      AIHandleError(error, next);
    }
  };
export const authorQuizVersion =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.authoring(
          req.account!.id,
          req.params.quizId!,
          req.params.versionId!,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };

export const publishQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        data: await service.publish(
          req.account!.id,
          req.params.quizId!,
          req.body as PublishQuizInput,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const regenerateQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
      if (!key.success)
        throw new ServiceError(
          'INVALID_INPUT',
          'A valid Idempotency-Key header is required.',
          400,
        );
      res.status(201).json({
        data: await service.regenerate(
          req.account!.id,
          req.params.quizId!,
          key.data,
          req.body as QuizGenerationInput,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };

export const listQuizzes =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = quizLibraryQuerySchema.parse(req.query);
      res.json(
        await service.list(
          req.account!.id,
          req.params.projectId!,
          query.page,
          query.pageSize,
          query.search,
        ),
      );
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const quizVersions =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = usageQuerySchema.parse(req.query);
      res.json(
        await service.versions(
          req.account!.id,
          req.params.quizId!,
          query.page,
          query.pageSize,
        ),
      );
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const findQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.find(req.account!.id, req.params.quizId!) });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const renameQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.rename(
          req.account!.id,
          req.params.quizId!,
          req.body.title as string,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const removeQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await service.remove(req.account!.id, req.params.quizId!);
      res.status(204).end();
    } catch (error) {
      AIHandleError(error, next);
    }
  };
export const duplicateQuiz =
  (service: QuizzesService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        data: await service.duplicate(
          req.account!.id,
          req.params.quizId!,
          req.body.expectedVersion as number,
        ),
      });
    } catch (error) {
      AIHandleError(error, next);
    }
  };
