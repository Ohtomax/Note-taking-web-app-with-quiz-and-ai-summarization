import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizHistoryService } from '@/services/quiz-history.service.js';
import { quizHistoryQuerySchema } from '@/utils/input-validators/quiz-history.js';
export const listQuizHistory =
  (service: QuizHistoryService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json(
        await service.list(req.account!.id, quizHistoryQuerySchema.parse(req.query)),
      );
    } catch (error) {
      next(error);
    }
  };
