import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizAttemptService } from '@/services/quiz-attempt.service.js';
import type { StartAttemptInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import { idempotencyKeySchema } from '@/utils/input-validators/generations.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const startQuizAttempt =
  (service: QuizAttemptService) =>
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
        data: await service.start(
          req.account!.id,
          req.params.quizId!,
          key.data,
          req.body as StartAttemptInput,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

export const readQuizAttempt =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.read(req.account!.id, req.params.attemptId!) });
    } catch (error) {
      next(error);
    }
  };
