import type {
  AnalyticsRepository,
  AnalyticsScope,
} from '@/repositories/analytics.repository.js';
import type {
  AnalyticsQuery,
  AnalyticsWindow,
  QuizAnalyticsQuery,
} from '@/utils/input-validators/analytics.js';
import { ServiceError } from '@/utils/error-handler/ServiceError.js';
export function resolveAnalyticsWindow(
  query: AnalyticsQuery,
  now = new Date(),
): AnalyticsWindow {
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const to = query.to ? new Date(query.to) : tomorrow,
    from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 86400000);
  if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
    throw new ServiceError(
      'INVALID_WINDOW',
      'Choose a window between one instant and 366 days.',
      400,
    );
  return { from, to };
}
export function fillDailyTrend<
  T extends {
    day: Date;
    attempts: number;
    meanScore: number | null;
    accuracy: number | null;
    correct: number;
    incorrect: number;
    skipped: number;
  },
>(rows: T[], window: AnalyticsWindow) {
  const index = new Map(rows.map((row) => [row.day.toISOString().slice(0, 10), row]));
  const result = [];
  for (
    let day = Date.UTC(
      window.from.getUTCFullYear(),
      window.from.getUTCMonth(),
      window.from.getUTCDate(),
    );
    day < window.to.getTime();
    day += 86400000
  ) {
    const date = new Date(day);
    result.push(
      index.get(date.toISOString().slice(0, 10)) ?? {
        day: date,
        attempts: 0,
        meanScore: null,
        accuracy: null,
        correct: 0,
        incorrect: 0,
        skipped: 0,
      },
    );
  }
  return result;
}
export const createAnalyticsService = (repository: AnalyticsRepository) => {
  const read = async (ownerId: string, query: AnalyticsQuery, scope: AnalyticsScope) => {
    const window = resolveAnalyticsWindow(query),
      data = await repository.aggregate(ownerId, window, scope);
    return { ...data, trend: fillDailyTrend(data.trend, window) };
  };
  return {
    quiz: async (ownerId: string, quizId: string, query: QuizAnalyticsQuery) => {
      const window = resolveAnalyticsWindow(query),
        scope = { kind: 'QUIZ' as const, id: quizId };
      const [data, breakdowns, detail] = await Promise.all([
        read(ownerId, query, scope),
        repository.breakdowns(ownerId, window, scope),
        repository.quizDetails(ownerId, window, quizId, query.versionPage),
      ]);
      return { ...data, breakdowns, ...detail };
    },
    project: async (ownerId: string, projectId: string, query: AnalyticsQuery) => {
      const window = resolveAnalyticsWindow(query),
        scope = { kind: 'PROJECT' as const, id: projectId };
      const [data, breakdowns] = await Promise.all([
        read(ownerId, query, scope),
        repository.breakdowns(ownerId, window, scope),
      ]);
      return { ...data, breakdowns };
    },
    global: (ownerId: string, query: AnalyticsQuery) =>
      read(ownerId, query, { kind: 'GLOBAL' }),
  };
};
export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
