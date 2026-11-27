import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizGenerationService } from '@/services/quiz-generation.service.js';
import type { QuizGenerationInput } from '@/utils/input-validators/quizzes.js';
import { idempotencyKeySchema } from '@/utils/input-validators/generations.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const generateQuiz =
  (service: QuizGenerationService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
      if (!key.success)
        throw new ServiceError(
          'INVALID_INPUT',
          'A valid Idempotency-Key header is required.',
          400,
        );
      res
        .status(201)
        .json({
          data: await service.generate(
            req.account!.id,
            req.params.projectId!,
            key.data,
            req.body as QuizGenerationInput,
          ),
        });
    } catch (error) {
      next(error);
    }
  };
