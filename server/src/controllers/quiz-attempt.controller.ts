import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/auth.type.js';
import type { QuizAttemptService } from '@/services/quiz-attempt.service.js';
import type { StartAttemptInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import type { AnswerInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import { idempotencyKeySchema } from '@/utils/input-validators/generations.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import { openAttemptQuerySchema } from '@/utils/input-validators/quiz-attempt.validator.js';
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

export const saveAttemptAnswer =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.answer(
          req.account!.id,
          req.params.attemptId!,
          req.params.questionId!,
          req.body as AnswerInput,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

export const submitQuizAttempt =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.submit(req.account!.id, req.params.attemptId!) });
    } catch (error) {
      next(error);
    }
  };

export const openQuizAttempts =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = openAttemptQuerySchema.parse(req.query);
      res.json(
        await service.open(req.account!.id, query.quizId, query.page, query.pageSize),
      );
    } catch (error) {
      next(error);
    }
  };
export const locateQuizAttempt =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: await service.locate(
          req.account!.id,
          req.params.attemptId!,
          req.body.questionIndex as number,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
export const abandonQuizAttempt =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.abandon(req.account!.id, req.params.attemptId!) });
    } catch (error) {
      next(error);
    }
  };

export const quizAttemptResults =
  (service: QuizAttemptService) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await service.results(req.account!.id, req.params.attemptId!) });
    } catch (error) {
      next(error);
    }
  };
