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
function topicScores(
  rows: Awaited<ReturnType<AnalyticsRepository['recentTopicAnswers']>>,
) {
  const topics = new Map<
    string,
    {
      sourceKey: string;
      topic: string;
      noteId: string | null;
      noteTitle: string;
      projectId: string;
      answered: number;
      correct: number;
    }
  >();
  for (const { version, answers } of rows) {
    const sources = new Map(version.sources.map((source) => [source.sourceKey, source]));
    for (const answer of answers) {
      if (!Array.isArray(answer.question.sourceKeys)) continue;
      const sourceKeys = answer.question.sourceKeys.filter(
        (key): key is string => typeof key === 'string' && sources.has(key),
      );
      const keys = answer.question.topic
        ? sourceKeys.slice(0, 1)
        : [...new Set(sourceKeys)];
      for (const key of keys) {
        const source = sources.get(key);
        if (!source) continue;
        const label = answer.question.topic ?? source.noteTitle;
        const topicKey =
          version.quiz.projectId +
          ':' +
          (answer.question.topic ? label.toLocaleLowerCase('en-US') : key);
        const topic = topics.get(topicKey) ?? {
          ...source,
          topic: label,
          projectId: version.quiz.projectId,
          answered: 0,
          correct: 0,
        };
        topic.answered++;
        topic.correct += Number(answer.isCorrect);
        topics.set(topicKey, topic);
      }
    }
  }
  const ranked = [...topics.values()].sort(
    (a, b) =>
      b.correct / b.answered - a.correct / a.answered ||
      b.answered - a.answered ||
      a.topic.localeCompare(b.topic),
  );
  return {
    strongest: ranked.filter((topic) => topic.correct > 0).slice(0, 3),
    review: ranked
      .filter((topic) => topic.correct < topic.answered)
      .reverse()
      .slice(0, 3),
  };
}

export const createAnalyticsService = (repository: AnalyticsRepository) => {
  const read = async (ownerId: string, query: AnalyticsQuery, scope: AnalyticsScope) => {
    const window = resolveAnalyticsWindow(query);
    const [data, topics] = await Promise.all([
      repository.aggregate(ownerId, window, scope),
      repository.recentTopicAnswers(ownerId, window, scope),
    ]);
    return {
      ...data,
      topics: topicScores(topics),
      trend: fillDailyTrend(data.trend, window),
    };
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
