import { createHash, randomInt } from 'node:crypto';
import {
  Prisma,
  type PrismaClient,
  type QuestionType,
} from '@/generated/prisma/client.js';
import type { StartAttemptInput } from '@/utils/input-validators/quiz-attempt.validator.js';
import { serializable } from './serializable.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
import type { AnswerOutcome, scoreAttempt } from '@/services/quiz-scoring.service.js';
export const attemptSelect = {
  lastQuestionIndex: true,
  id: true,
  versionId: true,
  requestKey: true,
  inputHash: true,
  mode: true,
  status: true,
  questionOrder: true,
  optionOrder: true,
  startedAt: true,
  finishedAt: true,
  correctCount: true,
  answeredCount: true,
  totalQuestions: true,
  answers: {
    orderBy: { questionId: 'asc' },
    select: {
      id: true,
      questionId: true,
      versionId: true,
      selectedOptionIds: true,
      text: true,
      isCorrect: true,
      revision: true,
      submittedAt: true,
    },
  },
  version: {
    select: {
      id: true,
      version: true,
      difficulty: true,
      includeExplanations: true,
      quiz: { select: { id: true, title: true, projectId: true } },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          type: true,
          prompt: true,
          explanation: true,
          acceptedAnswers: true,
          sourceKeys: true,
          options: {
            orderBy: { position: 'asc' },
            select: { id: true, position: true, text: true, isCorrect: true },
          },
        },
      },
      sources: {
        select: {
          sourceKey: true,
          noteId: true,
          noteTitle: true,
          revision: true,
          rangeStart: true,
          rangeEnd: true,
          contentHash: true,
        },
      },
    },
  },
} as const;
export type AttemptRow = Prisma.QuizAttemptGetPayload<{ select: typeof attemptSelect }>;
export const ATTEMPT_TTL_MS = 7 * 86400000;
export async function expireAttempts(db: PrismaClient, ownerId: string, id?: string) {
  return db.quizAttempt.updateMany({
    where: {
      ...(id ? { id } : {}),
      status: 'IN_PROGRESS',
      startedAt: { lte: new Date(Date.now() - ATTEMPT_TTL_MS) },
      version: { quiz: { project: { ownerId } } },
    },
    data: {
      status: 'ABANDONED',
      finishedAt: new Date(),
      correctCount: null,
      answeredCount: null,
    },
  });
}
export async function lockAttempt(
  tx: Prisma.TransactionClient,
  ownerId: string,
  id: string,
): Promise<AttemptRow> {
  const locked = await tx.quizAttempt.updateMany({
    where: { id, version: { quiz: { project: { ownerId } } } },
    data: { id },
  });
  if (!locked.count)
    throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
  return tx.quizAttempt.findUniqueOrThrow({ where: { id }, select: attemptSelect });
}
function sameAnswer(answer: AttemptRow['answers'][number], outcome: AnswerOutcome) {
  return (
    JSON.stringify(answer.selectedOptionIds) ===
      JSON.stringify(outcome.selectedOptionIds) && answer.text === outcome.text
  );
}
function shuffled<T>(items: T[], enabled: boolean): T[] {
  const result = [...items];
  if (enabled)
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
  return result;
}
export const createQuizAttemptRepository = (db: PrismaClient) => ({
  expire: (ownerId: string, id: string) => expireAttempts(db, ownerId, id),
  open: async (
    ownerId: string,
    quizId: string | undefined,
    page: number,
    pageSize: number,
  ) => {
    await expireAttempts(db, ownerId);
    const where = {
      status: 'IN_PROGRESS' as const,
      version: { ...(quizId ? { quizId } : {}), quiz: { project: { ownerId } } },
    };
    const [data, total] = await db.$transaction([
      db.quizAttempt.findMany({
        where,
        select: {
          id: true,
          versionId: true,
          mode: true,
          status: true,
          startedAt: true,
          lastQuestionIndex: true,
          totalQuestions: true,
          version: {
            select: {
              version: true,
              difficulty: true,
              quiz: { select: { id: true, title: true, projectId: true } },
            },
          },
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.quizAttempt.count({ where }),
    ]);
    return {
      data: data.map(({ version, ...attempt }) => ({
        ...attempt,
        version: version.version,
        difficulty: version.difficulty,
        quizId: version.quiz.id,
        quizTitle: version.quiz.title,
        projectId: version.quiz.projectId,
      })),
      total,
      page,
      pageSize,
    };
  },
  locate: (ownerId: string, id: string, questionIndex: number) =>
    serializable(db, async (tx) => {
      const attempt = await lockAttempt(tx, ownerId, id);
      if (attempt.status !== 'IN_PROGRESS')
        throw new ServiceError('ATTEMPT_CLOSED', 'This attempt cannot be changed.', 409);
      if (questionIndex >= attempt.totalQuestions)
        throw new ServiceError(
          'INVALID_INPUT',
          'Question location is out of range.',
          400,
        );
      return tx.quizAttempt.update({
        where: { id },
        data: { lastQuestionIndex: questionIndex },
        select: attemptSelect,
      });
    }),
  abandon: (ownerId: string, id: string) =>
    serializable(db, async (tx) => {
      const attempt = await lockAttempt(tx, ownerId, id);
      if (attempt.status === 'ABANDONED') return attempt;
      if (attempt.status !== 'IN_PROGRESS')
        throw new ServiceError(
          'ATTEMPT_CLOSED',
          'A completed attempt cannot be abandoned.',
          409,
        );
      return tx.quizAttempt.update({
        where: { id },
        data: {
          status: 'ABANDONED',
          finishedAt: new Date(),
          correctCount: null,
          answeredCount: null,
        },
        select: attemptSelect,
      });
    }),
  finalize: (
    ownerId: string,
    id: string,
    grade: (row: AttemptRow) => ReturnType<typeof scoreAttempt>,
  ) =>
    serializable(db, async (tx) => {
      const attempt = await lockAttempt(tx, ownerId, id);
      if (attempt.status === 'COMPLETED') return attempt;
      if (attempt.status !== 'IN_PROGRESS')
        throw new ServiceError(
          'ATTEMPT_CLOSED',
          'This attempt cannot be submitted.',
          409,
        );
      const result = grade(attempt);
      if (result.totalQuestions !== attempt.totalQuestions)
        throw new ServiceError(
          'ATTEMPT_INVALID',
          'The assigned question set is inconsistent.',
          409,
        );
      for (const outcome of result.outcomes) {
        const answer = attempt.answers.find(
          (item) => item.questionId === outcome.questionId,
        );
        if (answer)
          await tx.quizAttemptAnswer.update({
            where: { id: answer.id },
            data: { isCorrect: outcome.answered ? outcome.isCorrect : null },
          });
      }
      const finishedAt = new Date();
      const types = new Map<
        QuestionType,
        { assigned: number; answered: number; correct: number }
      >();
      for (const outcome of result.outcomes) {
        const type = attempt.version.questions.find(
          (question) => question.id === outcome.questionId,
        )!.type;
        const metric = types.get(type) ?? { assigned: 0, answered: 0, correct: 0 };
        metric.assigned++;
        if (outcome.answered) metric.answered++;
        if (outcome.isCorrect) metric.correct++;
        types.set(type, metric);
      }
      await tx.quizAttemptTypeMetric.createMany({
        data: [...types].map(([type, metric]) => ({ attemptId: id, type, ...metric })),
      });
      return tx.quizAttempt.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          finishedAt,
          scoreRatio: result.totalQuestions
            ? result.correctCount / result.totalQuestions
            : null,
          elapsedMs: Math.max(0, finishedAt.getTime() - attempt.startedAt.getTime()),
          completedDay: new Date(
            Date.UTC(
              finishedAt.getUTCFullYear(),
              finishedAt.getUTCMonth(),
              finishedAt.getUTCDate(),
            ),
          ),
          correctCount: result.correctCount,
          answeredCount: result.answeredCount,
        },
        select: attemptSelect,
      });
    }),
  exam: (
    ownerId: string,
    id: string,
    questionId: string,
    expectedRevision: number,
    outcome: AnswerOutcome,
  ) =>
    serializable(db, async (tx) => {
      const attempt = await lockAttempt(tx, ownerId, id);
      if (attempt.status !== 'IN_PROGRESS' || attempt.mode !== 'EXAM')
        throw new ServiceError(
          'ATTEMPT_CLOSED',
          'This exam attempt cannot be changed.',
          409,
        );
      if (!attempt.version.questions.some((question) => question.id === questionId))
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const answer = attempt.answers.find((item) => item.questionId === questionId);
      if (expectedRevision !== (answer?.revision ?? 0))
        throw new ServiceError(
          'ANSWER_REVISION_CONFLICT',
          'A newer answer is recorded. Reload before changing it.',
          409,
        );
      const data = {
        selectedOptionIds: outcome.selectedOptionIds,
        text: outcome.text,
        isCorrect: null,
      };
      if (answer)
        await tx.quizAttemptAnswer.update({
          where: { id: answer.id },
          data: { ...data, revision: { increment: 1 }, submittedAt: new Date() },
        });
      else
        await tx.quizAttemptAnswer.create({
          data: { attemptId: id, versionId: attempt.versionId, questionId, ...data },
        });
      return tx.quizAttempt.findUniqueOrThrow({ where: { id }, select: attemptSelect });
    }),
  practice: (
    ownerId: string,
    id: string,
    questionId: string,
    expectedRevision: number,
    outcome: AnswerOutcome,
  ) =>
    serializable(db, async (tx) => {
      const attempt = await lockAttempt(tx, ownerId, id);
      if (attempt.status !== 'IN_PROGRESS' || attempt.mode !== 'PRACTICE')
        throw new ServiceError(
          'ATTEMPT_CLOSED',
          'This practice attempt cannot be changed.',
          409,
        );
      if (!attempt.version.questions.some((question) => question.id === questionId))
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const existing = attempt.answers.find((answer) => answer.questionId === questionId);
      if (existing) {
        if (sameAnswer(existing, outcome)) return attempt;
        throw new ServiceError(
          'ANSWER_LOCKED',
          'A practice answer is already recorded for this question.',
          409,
        );
      }
      if (expectedRevision !== 0)
        throw new ServiceError(
          'ANSWER_REVISION_CONFLICT',
          'Reload the recorded answer before retrying.',
          409,
        );
      await tx.quizAttemptAnswer.create({
        data: {
          attemptId: id,
          versionId: attempt.versionId,
          questionId,
          selectedOptionIds: outcome.selectedOptionIds,
          text: outcome.text,
          isCorrect: outcome.isCorrect,
        },
      });
      return tx.quizAttempt.findUniqueOrThrow({ where: { id }, select: attemptSelect });
    }),
  start: async (
    ownerId: string,
    quizId: string,
    key: string,
    input: StartAttemptInput,
  ) => {
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ quizId, ...input }))
      .digest('hex');
    const existing = async () =>
      db.quizAttempt.findFirst({
        where: {
          versionId: input.versionId,
          requestKey: key,
          version: { quiz: { id: quizId, project: { ownerId } } },
        },
        select: attemptSelect,
      });
    const check = (row: AttemptRow) => {
      if (row.inputHash !== inputHash)
        throw new ServiceError(
          'IDEMPOTENCY_CONFLICT',
          'Use a new start key for different attempt settings.',
          409,
        );
      return row;
    };
    const previous = await existing();
    if (previous) return check(previous);
    try {
      return await serializable(db, async (tx) => {
        const version = await tx.quizVersion.findFirst({
          where: {
            id: input.versionId,
            quizId,
            quiz: { deletedAt: null, project: { ownerId, deletedAt: null } },
          },
          select: {
            id: true,
            questions: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                options: { orderBy: { position: 'asc' }, select: { id: true } },
              },
            },
          },
        });
        if (!version)
          throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
        if (!version.questions.length)
          throw new ServiceError(
            'QUIZ_EMPTY',
            'This version has no playable questions.',
            422,
          );
        const row = await tx.quizAttempt.upsert({
          where: { versionId_requestKey: { versionId: version.id, requestKey: key } },
          update: {},
          create: {
            versionId: version.id,
            requestKey: key,
            inputHash,
            mode: input.mode,
            totalQuestions: version.questions.length,
            questionOrder: shuffled(
              version.questions.map((q) => q.id),
              input.shuffleQuestions,
            ),
            optionOrder: Object.fromEntries(
              version.questions.map((q) => [
                q.id,
                shuffled(
                  q.options.map((o) => o.id),
                  input.shuffleOptions,
                ),
              ]),
            ),
          },
          select: attemptSelect,
        });
        return check(row);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await existing();
        if (duplicate) return check(duplicate);
      }
      throw error;
    }
  },
  load: async (ownerId: string, id: string) => {
    await expireAttempts(db, ownerId, id);
    const attempt = await db.quizAttempt.findFirst({
      where: { id, version: { quiz: { project: { ownerId } } } },
      select: attemptSelect,
    });
    if (!attempt) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    return attempt;
  },
});
export type QuizAttemptRepository = ReturnType<typeof createQuizAttemptRepository>;
