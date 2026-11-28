import type { PrismaClient } from '@/generated/prisma/client.js';
import type { QuizHistoryQuery } from '@/utils/input-validators/quiz-history.js';
import { expireAttempts } from './quiz-attempt.repository.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export const historySelect = {
  attemptNumber: true,
  focusedReview: true,
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
  comparison: (ownerId: string, attemptId: string) =>
    db.$transaction(async (tx) => {
      const selected = await tx.quizAttempt.findFirst({
        where: { id: attemptId, version: { quiz: { project: { ownerId } } } },
        select: historySelect,
      });
      if (!selected)
        throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
      const where = {
        version: { quizId: selected.version.quiz.id, quiz: { project: { ownerId } } },
        status: 'COMPLETED' as const,
        focusedReview: selected.focusedReview,
        correctCount: { not: null },
        finishedAt: { not: null },
        totalQuestions: { gt: 0 },
      };
      const [first, latest, groups] = await Promise.all([
        tx.quizAttempt.findFirst({
          where,
          select: historySelect,
          orderBy: [{ finishedAt: 'asc' }, { id: 'asc' }],
        }),
        tx.quizAttempt.findFirst({
          where,
          select: historySelect,
          orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
        }),
        tx.quizAttempt.groupBy({
          by: ['correctCount', 'totalQuestions'],
          where,
          _count: { _all: true },
        }),
      ]);
      const project = (row: typeof selected | null) =>
        row
          ? {
              id: row.id,
              versionId: row.versionId,
              version: row.version.version,
              status: row.status,
              mode: row.mode,
              startedAt: row.startedAt,
              finishedAt: row.finishedAt,
              percentage:
                row.status === 'COMPLETED' &&
                row.correctCount !== null &&
                row.totalQuestions
                  ? (100 * row.correctCount) / row.totalQuestions
                  : null,
              elapsedMs:
                row.status === 'COMPLETED' && row.finishedAt
                  ? Math.max(0, row.finishedAt.getTime() - row.startedAt.getTime())
                  : null,
            }
          : null;
      return {
        quizId: selected.version.quiz.id,
        quizTitle: selected.version.quiz.title,
        attemptCount: groups.reduce((sum, group) => sum + group._count._all, 0),
        bestScore: groups.length
          ? Math.max(
              ...groups.map(
                (group) => (100 * group.correctCount!) / group.totalQuestions,
              ),
            )
          : null,
        first: project(first),
        selected: project(selected),
        latest: project(latest),
      };
    }),
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
      attemptNumber: row.attemptNumber,
      focusedReview: row.focusedReview,
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
