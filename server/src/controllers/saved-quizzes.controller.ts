import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizzesService } from '@/services/quizzes.service.js';
import { AIHandleError } from '@/utils/error-handler/aiErrorHandler.js';
export const saveQuiz =
  (service: QuizzesService) =>
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
