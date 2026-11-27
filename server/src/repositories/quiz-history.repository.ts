import type { PrismaClient } from '@/generated/prisma/client.js';
import type { QuizHistoryQuery } from '@/utils/input-validators/quiz-history.js';
import { expireAttempts } from './quiz-attempt.repository.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const historySelect = {
  id: true,
  versionId: true,
  mode: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  totalQuestions: true,
  correctCount: true,
  answeredCount: true,
  lastQuestionIndex: true,
  version: {
    select: {
      version: true,
      difficulty: true,
      quiz: {
        select: {
          id: true,
          title: true,
          projectId: true,
          deletedAt: true,
          project: { select: { title: true, deletedAt: true } },
        },
      },
    },
  },
} as const;
export const createQuizHistoryRepository = (db: PrismaClient) => ({
  list: async (ownerId: string, query: QuizHistoryQuery) => {
    await expireAttempts(db, ownerId);
    if (
      query.projectId &&
      !(await db.project.findFirst({
        where: { id: query.projectId, ownerId },
        select: { id: true },
      }))
    )
      throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    if (
      query.quizId &&
      !(await db.quiz.findFirst({
        where: {
          id: query.quizId,
          ...(query.projectId ? { projectId: query.projectId } : {}),
          project: { ownerId },
        },
        select: { id: true },
      }))
    )
      throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            startedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
      version: {
        ...(query.quizId ? { quizId: query.quizId } : {}),
        quiz: {
          ...(query.projectId ? { projectId: query.projectId } : {}),
          project: { ownerId },
        },
      },
    };
    const [rows, total] = await db.$transaction([
      db.quizAttempt.findMany({
        where,
        select: historySelect,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      db.quizAttempt.count({ where }),
    ]);
    const data = rows.map((row) => ({
      id: row.id,
      versionId: row.versionId,
      version: row.version.version,
      quizId: row.version.quiz.id,
      quizTitle: row.version.quiz.title,
      projectId: row.version.quiz.projectId,
      projectTitle: row.version.quiz.project.title,
      quizDeleted: Boolean(row.version.quiz.deletedAt),
      projectDeleted: Boolean(row.version.quiz.project.deletedAt),
      difficulty: row.version.difficulty,
      mode: row.mode,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      lastQuestionIndex: row.lastQuestionIndex,
      totalQuestions: row.totalQuestions,
      correctCount: row.status === 'COMPLETED' ? row.correctCount : null,
      answeredCount: row.status === 'COMPLETED' ? row.answeredCount : null,
      percentage:
        row.status === 'COMPLETED' && row.correctCount !== null && row.totalQuestions > 0
          ? (100 * row.correctCount) / row.totalQuestions
          : null,
      elapsedMs:
        row.status === 'COMPLETED' && row.finishedAt
          ? Math.max(0, row.finishedAt.getTime() - row.startedAt.getTime())
          : null,
    }));
    return { data, total, page: query.page, pageSize: query.pageSize };
  },
});
export type QuizHistoryRepository = ReturnType<typeof createQuizHistoryRepository>;
