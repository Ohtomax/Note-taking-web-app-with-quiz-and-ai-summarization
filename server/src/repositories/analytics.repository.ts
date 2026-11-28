import type {
  Prisma,
  PrismaClient,
  Difficulty,
  QuestionType,
} from '@/generated/prisma/client.js';
import { expireAttempts } from './quiz-attempt.repository.js';
import type { AnalyticsWindow } from '@/utils/input-validators/analytics.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export interface AnalyticsScope {
  kind: 'GLOBAL' | 'PROJECT' | 'QUIZ';
  id?: string;
}
export async function analyticsScope(
  db: PrismaClient,
  ownerId: string,
  scope: AnalyticsScope,
) {
  let projectId: string | undefined,
    quizId: string | undefined,
    title = 'All study activity';
  if (scope.kind === 'PROJECT') {
    const project = await db.project.findFirst({
      where: { id: scope.id!, ownerId },
      select: { id: true, title: true },
    });
    if (!project) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    projectId = project.id;
    title = project.title;
  }
  if (scope.kind === 'QUIZ') {
    const quiz = await db.quiz.findFirst({
      where: { id: scope.id!, project: { ownerId } },
      select: { id: true, title: true, projectId: true },
    });
    if (!quiz) throw new ServiceError('RESOURCE_NOT_FOUND', 'Resource not found', 404);
    quizId = quiz.id;
    projectId = quiz.projectId;
    title = quiz.title;
  }
  const version = {
    ...(quizId ? { quizId } : {}),
    quiz: { ...(projectId ? { projectId } : {}), project: { ownerId } },
  };
  return {
    scope: { kind: scope.kind, id: scope.id ?? null, title },
    projectId,
    quizId,
    version,
  };
}
export function completedWhere(
  version: NonNullable<Prisma.QuizAttemptWhereInput['version']>,
  window: AnalyticsWindow,
): Prisma.QuizAttemptWhereInput {
  return {
    version,
    status: 'COMPLETED',
    finishedAt: { gte: window.from, lt: window.to },
  };
}
export const createAnalyticsRepository = (db: PrismaClient) => ({
  recentTopicAnswers: async (
    ownerId: string,
    window: AnalyticsWindow,
    scope: AnalyticsScope,
  ) => {
    const resolved = await analyticsScope(db, ownerId, scope);
    return db.quizAttempt.findMany({
      where: completedWhere(resolved.version, window),
      orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: {
        version: {
          select: {
            quiz: { select: { projectId: true } },
            sources: { select: { sourceKey: true, noteId: true, noteTitle: true } },
          },
        },
        answers: {
          where: { isCorrect: { not: null } },
          select: { isCorrect: true, question: { select: { sourceKeys: true } } },
        },
      },
    });
  },
  quizDetails: async (
    ownerId: string,
    window: AnalyticsWindow,
    quizId: string,
    page: number,
  ) => {
    const resolved = await analyticsScope(db, ownerId, { kind: 'QUIZ', id: quizId });
    const completed = {
      ...completedWhere(resolved.version, window),
      scoreRatio: { not: null },
    };
    const fullAttempts = { ...completed, focusedReview: false };
    const versionWhere = { quizId, attempts: { some: completed } };
    const [versions, total, wrong] = await Promise.all([
      db.quizVersion.findMany({
        where: versionWhere,
        select: { id: true, version: true, difficulty: true, generatedAt: true },
        orderBy: { version: 'asc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      db.quizVersion.count({ where: versionWhere }),
      db.quizAttemptAnswer.groupBy({
        by: ['questionId', 'versionId'],
        where: { isCorrect: false, attempt: fullAttempts },
        _count: { _all: true },
        orderBy: [{ _count: { questionId: 'desc' } }, { questionId: 'asc' }],
        take: 10,
      }),
    ]);
    const ids = versions.map((version) => version.id),
      questionIds = wrong.map((row) => row.questionId),
      wrongVersionIds = [...new Set(wrong.map((row) => row.versionId))];
    const [versionStats, questions, answerSamples, assignedSamples] = await Promise.all([
      db.quizAttempt.groupBy({
        by: ['versionId'],
        where: { ...completed, versionId: { in: ids } },
        _count: { _all: true },
        _avg: { scoreRatio: true, elapsedMs: true },
        _max: { scoreRatio: true },
      }),
      db.quizQuestion.findMany({
        where: {
          id: { in: questionIds },
          version: { quizId, quiz: { project: { ownerId } } },
        },
        select: {
          id: true,
          prompt: true,
          type: true,
          versionId: true,
          version: { select: { version: true } },
        },
      }),
      db.quizAttemptAnswer.groupBy({
        by: ['questionId'],
        where: {
          questionId: { in: questionIds },
          isCorrect: { not: null },
          attempt: fullAttempts,
        },
        _count: { _all: true },
      }),
      db.quizAttempt.groupBy({
        by: ['versionId'],
        where: { ...fullAttempts, versionId: { in: wrongVersionIds } },
        _count: { _all: true },
      }),
    ]);
    return {
      versions: {
        data: versions.map((version) => {
          const stats = versionStats.find((row) => row.versionId === version.id);
          return {
            versionId: version.id,
            version: version.version,
            difficulty: version.difficulty,
            generatedAt: version.generatedAt,
            attempts: stats?._count._all ?? 0,
            meanScore:
              stats?._avg.scoreRatio === null || stats?._avg.scoreRatio === undefined
                ? null
                : 100 * stats._avg.scoreRatio,
            highestScore:
              stats?._max.scoreRatio === null || stats?._max.scoreRatio === undefined
                ? null
                : 100 * stats._max.scoreRatio,
            meanElapsedMs: stats?._avg.elapsedMs ?? null,
          };
        }),
        total,
        page,
        pageSize: 20,
      },
      missed: wrong.map((row) => {
        const question = questions.find((item) => item.id === row.questionId)!,
          answered =
            answerSamples.find((item) => item.questionId === row.questionId)?._count
              ._all ?? 0,
          assigned =
            assignedSamples.find((item) => item.versionId === row.versionId)?._count
              ._all ?? 0;
        return {
          questionId: row.questionId,
          versionId: row.versionId,
          version: question.version.version,
          prompt: question.prompt,
          type: question.type,
          incorrect: row._count._all,
          answered,
          assigned,
          skipped: Math.max(0, assigned - answered),
          wrongRate: answered ? (100 * row._count._all) / answered : null,
        };
      }),
    };
  },
  breakdowns: async (ownerId: string, window: AnalyticsWindow, scope: AnalyticsScope) => {
    const resolved = await analyticsScope(db, ownerId, scope);
    const where = {
      ...completedWhere(resolved.version, window),
      scoreRatio: { not: null },
    };
    const difficultyLevels: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'MIXED'];
    const [typeRows, difficulty] = await Promise.all([
      db.quizAttemptTypeMetric.groupBy({
        by: ['type'],
        where: { attempt: where },
        _count: { _all: true },
        _sum: { assigned: true, answered: true, correct: true },
      }),
      Promise.all(
        difficultyLevels.map(async (level) => {
          const stats = await db.quizAttempt.aggregate({
            where: { ...where, version: { ...resolved.version, difficulty: level } },
            _count: { _all: true },
            _sum: { totalQuestions: true, answeredCount: true, correctCount: true },
            _avg: { scoreRatio: true },
          });
          const assigned = stats._sum.totalQuestions ?? 0,
            answered = stats._sum.answeredCount ?? 0,
            correct = stats._sum.correctCount ?? 0;
          return {
            difficulty: level,
            attempts: stats._count._all,
            assigned,
            answered,
            correct,
            incorrect: answered - correct,
            skipped: assigned - answered,
            meanScore:
              stats._avg.scoreRatio === null ? null : 100 * stats._avg.scoreRatio,
            accuracy: answered ? (100 * correct) / answered : null,
          };
        }),
      ),
    ]);
    const questionTypes: QuestionType[] = [
      'MULTIPLE_CHOICE',
      'TRUE_FALSE',
      'MULTIPLE_SELECT',
      'IDENTIFICATION',
    ];
    const types = questionTypes.map((type) => {
      const row = typeRows.find((item) => item.type === type),
        assigned = row?._sum.assigned ?? 0,
        answered = row?._sum.answered ?? 0,
        correct = row?._sum.correct ?? 0;
      return {
        type,
        attempts: row?._count._all ?? 0,
        assigned,
        answered,
        correct,
        incorrect: answered - correct,
        skipped: assigned - answered,
        score: assigned ? (100 * correct) / assigned : null,
        accuracy: answered ? (100 * correct) / answered : null,
      };
    });
    return { difficulty, types };
  },
  aggregate: async (ownerId: string, window: AnalyticsWindow, scope: AnalyticsScope) => {
    await expireAttempts(db, ownerId);
    const resolved = await analyticsScope(db, ownerId, scope);
    const parent = {
      ownerId,
      deletedAt: null,
      ...(resolved.projectId ? { id: resolved.projectId } : {}),
    };
    const childParent = {
      ownerId,
      deletedAt: null,
      ...(resolved.projectId ? { id: resolved.projectId } : {}),
    };
    const completed = completedWhere(resolved.version, window),
      scored = {
        ...completed,
        scoreRatio: { not: null },
        correctCount: { not: null },
        answeredCount: { not: null },
      };
    const activity: Prisma.QuizAttemptWhereInput = {
      version: resolved.version,
      OR: [
        { status: 'COMPLETED', finishedAt: { gte: window.from, lt: window.to } },
        { status: { not: 'COMPLETED' }, startedAt: { gte: window.from, lt: window.to } },
      ],
    };
    const [
      projects,
      archivedProjects,
      notes,
      archivedNotes,
      summaries,
      quizzes,
      statusRows,
      stats,
      series,
      first,
      latest,
      recent,
    ] = await Promise.all([
      db.project.count({ where: parent }),
      db.project.count({ where: { ...parent, archivedAt: { not: null } } }),
      db.note.count({ where: { deletedAt: null, project: childParent } }),
      db.note.count({
        where: { deletedAt: null, archivedAt: { not: null }, project: childParent },
      }),
      db.summary.count({ where: { deletedAt: null, project: childParent } }),
      db.quiz.count({
        where: {
          deletedAt: null,
          ...(resolved.quizId ? { id: resolved.quizId } : {}),
          project: childParent,
        },
      }),
      db.quizAttempt.groupBy({ by: ['status'], where: activity, _count: { _all: true } }),
      db.quizAttempt.aggregate({
        where: scored,
        _count: { _all: true, elapsedMs: true },
        _sum: {
          correctCount: true,
          answeredCount: true,
          totalQuestions: true,
          elapsedMs: true,
        },
        _avg: { scoreRatio: true, elapsedMs: true },
        _max: { scoreRatio: true },
      }),
      db.quizAttempt.groupBy({
        by: ['completedDay'],
        where: { ...scored, completedDay: { not: null } },
        _count: { _all: true },
        _avg: { scoreRatio: true },
        _sum: { correctCount: true, answeredCount: true, totalQuestions: true },
        orderBy: { completedDay: 'asc' },
      }),
      db.quizAttempt.findFirst({
        where: scored,
        select: {
          id: true,
          scoreRatio: true,
          version: { select: { version: true, quizId: true } },
          finishedAt: true,
        },
        orderBy: [{ finishedAt: 'asc' }, { id: 'asc' }],
      }),
      db.quizAttempt.findFirst({
        where: scored,
        select: {
          id: true,
          scoreRatio: true,
          version: { select: { version: true, quizId: true } },
          finishedAt: true,
        },
        orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }],
      }),
      db.quizAttempt.findMany({
        where: activity,
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          scoreRatio: true,
          version: {
            select: {
              version: true,
              quiz: { select: { id: true, title: true, projectId: true } },
            },
          },
        },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    ]);
    const statusCounts = { IN_PROGRESS: 0, COMPLETED: 0, ABANDONED: 0 };
    for (const row of statusRows) statusCounts[row.status] = row._count._all;
    const assigned = stats._sum.totalQuestions ?? 0,
      answered = stats._sum.answeredCount ?? 0,
      correct = stats._sum.correctCount ?? 0;
    const firstScore =
        first?.scoreRatio !== null && first?.scoreRatio !== undefined
          ? 100 * first.scoreRatio
          : null,
      latestScore =
        latest?.scoreRatio !== null && latest?.scoreRatio !== undefined
          ? 100 * latest.scoreRatio
          : null;
    return {
      scope: resolved.scope,
      window: { from: window.from, to: window.to },
      workspace: { projects, archivedProjects, notes, archivedNotes, summaries, quizzes },
      statusCounts,
      totals: {
        completedAttempts: statusCounts.COMPLETED,
        scoredAttempts: stats._count._all,
        durationSamples: stats._count.elapsedMs,
        questionsAssigned: assigned,
        answered,
        correct,
        incorrect: answered - correct,
        skipped: assigned - answered,
        meanScore: stats._avg.scoreRatio === null ? null : 100 * stats._avg.scoreRatio,
        highestScore: stats._max.scoreRatio === null ? null : 100 * stats._max.scoreRatio,
        accuracy: answered ? (100 * correct) / answered : null,
        totalElapsedMs: stats._sum.elapsedMs ?? 0,
        meanElapsedMs: stats._avg.elapsedMs,
        firstScore,
        latestScore,
        improvement:
          firstScore === null || latestScore === null ? null : latestScore - firstScore,
      },
      trend: series.map((row) => {
        const correct = row._sum.correctCount ?? 0,
          answered = row._sum.answeredCount ?? 0;
        return {
          day: row.completedDay!,
          attempts: row._count._all,
          meanScore: row._avg.scoreRatio === null ? null : 100 * row._avg.scoreRatio,
          accuracy: answered ? (100 * correct) / answered : null,
          correct,
          incorrect: answered - correct,
          skipped: (row._sum.totalQuestions ?? 0) - answered,
        };
      }),
      recent: recent.map((row) => ({
        id: row.id,
        quizId: row.version.quiz.id,
        quizTitle: row.version.quiz.title,
        projectId: row.version.quiz.projectId,
        version: row.version.version,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
        percentage:
          row.status === 'COMPLETED' && row.scoreRatio !== null
            ? 100 * row.scoreRatio
            : null,
      })),
    };
  },
});
export type AnalyticsRepository = ReturnType<typeof createAnalyticsRepository>;
