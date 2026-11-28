import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleMinus,
  CircleX,
  ListChecks,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { formatDuration, formatPercent } from '@/utils/display';
import { normalizeAnswer } from '@/utils/answer-normalization';
import { RetakeQuiz } from './RetakeQuiz';
import { SourceLink } from '@/features/notes/SourceLink';
import type { PlayerAttempt } from '@/types/attempts';

const filters = [
  'All questions',
  'Correct answers',
  'Incorrect answers',
  'Unanswered',
] as const;

function reviewQuestions(attempt: PlayerAttempt) {
  const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  const sources = new Map(attempt.sources.map((source) => [source.sourceKey, source]));
  return attempt.questions.map((question) => {
    const answer = answers.get(question.id);
    const selected = answer?.selectedOptionIds ?? [];
    const response =
      question.type === 'IDENTIFICATION'
        ? normalizeAnswer(answer?.text ?? '')
          ? answer?.text
          : ''
        : question.options
            .filter((option) => selected.includes(option.id))
            .map((option) => option.text)
            .join(', ');
    const accepted =
      question.type === 'IDENTIFICATION'
        ? question.feedback?.acceptedAnswers.join(' / ')
        : question.options
            .filter((option) => question.feedback?.correctOptionIds.includes(option.id))
            .map((option) => option.text)
            .join(', ');
    return {
      question,
      response,
      selected,
      accepted,
      status: !response
        ? 'Unanswered'
        : question.feedback?.isCorrect
          ? 'Correct answers'
          : 'Incorrect answers',
      sources: question.sourceKeys.flatMap((key) => {
        const source = sources.get(key);
        return source ? [source] : [];
      }),
    } as const;
  });
}

const statusDisplay = {
  'Correct answers': {
    label: 'Correct',
    Icon: CheckCircle2,
    color: 'text-emerald-800 dark:text-emerald-300',
  },
  'Incorrect answers': {
    label: 'Incorrect',
    Icon: CircleX,
    color: 'text-red-800 dark:text-red-300',
  },
  Unanswered: { label: 'Unanswered', Icon: CircleMinus, color: 'text-muted' },
};

function AnswerReview({ attempt }: { attempt: PlayerAttempt }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All questions');
  const visible = reviewQuestions(attempt).filter(
    (row) => filter === 'All questions' || row.status === filter,
  );
  return (
    <section id="answer-review" className="scroll-mt-5" aria-labelledby="review-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="review-heading" className="text-xl font-semibold tracking-tight">
          Answer review
        </h2>
        <label className="grid gap-1 text-xs text-muted">
          Filter answers
          <select
            className="field text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            {filters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {visible.length === 0 && (
        <p role="status" className="surface p-5 text-muted">
          No questions match this filter.
        </p>
      )}
      <ol className="grid gap-3">
        {visible.map(({ question, response, selected, accepted, status, sources }) => {
          const { label, Icon, color } = statusDisplay[status];
          return (
            <li className="surface p-4 sm:p-5" key={question.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {question.position}. {question.prompt}
                </h3>
                <span
                  className={'flex items-center gap-1.5 text-sm font-semibold ' + color}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </span>
              </div>
              {question.options.length > 0 && (
                <ul className="my-3 grid gap-1.5" aria-label="Available choices">
                  {question.options.map((option) => {
                    const correct = question.feedback?.correctOptionIds.includes(
                      option.id,
                    );
                    const chosen = selected.includes(option.id);
                    return (
                      <li
                        className={
                          'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ' +
                          (correct
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : chosen
                              ? 'border-red-500/40 bg-red-500/10'
                              : 'border-edge')
                        }
                        key={option.id}
                      >
                        <span className="flex-1">{option.text}</span>
                        {chosen && (
                          <span className="text-xs font-semibold">Your choice</span>
                        )}
                        {correct && (
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            Correct choice
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-sm">Your answer: {response || 'No answer recorded'}</p>
              <p className="mt-1 text-sm">Accepted answer: {accepted || 'Unavailable'}</p>
              {question.feedback?.explanation && (
                <div className="mt-3 rounded-lg bg-canvas p-3 text-sm">
                  <h4 className="mb-1 font-semibold">Explanation</h4>
                  <p className="whitespace-pre-wrap">{question.feedback.explanation}</p>
                </div>
              )}
              {sources.length > 0 && (
                <ul
                  className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm"
                  aria-label="Source material"
                >
                  {sources.map((source) => (
                    <li key={source.sourceKey}>
                      <SourceLink projectId={attempt.projectId} source={source} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TopicPerformance({ attempt }: { attempt: PlayerAttempt }) {
  const topics = new Map<
    string,
    { source: PlayerAttempt['sources'][number]; assigned: number; correct: number }
  >();
  for (const row of reviewQuestions(attempt)) {
    for (const source of row.sources) {
      const topic = topics.get(source.sourceKey) ?? { source, assigned: 0, correct: 0 };
      topic.assigned++;
      topic.correct += Number(row.status === 'Correct answers');
      topics.set(source.sourceKey, topic);
    }
  }
  if (!topics.size) return null;
  return (
    <section className="surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <BookOpen size={18} aria-hidden="true" className="text-brand-text" />
        Performance by study source
      </h2>
      <ul className="mt-4 grid gap-3">
        {[...topics.values()]
          .sort((a, b) => a.correct / a.assigned - b.correct / b.assigned)
          .map(({ source, assigned, correct }) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3 text-sm"
              key={source.sourceKey}
            >
              <SourceLink source={source} projectId={attempt.projectId} />
              <span className="text-muted">
                {correct} / {assigned} correct
                {correct < assigned ? ' · Review this material' : ''}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}

export default function QuizResults() {
  const { attemptId = '' } = useParams();
  const uid = useSession((state) => state.user!.uid);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery({
    queryKey: [uid, 'player-results', attemptId],
    queryFn: ({ signal }) => attemptsApi.results(attemptId, signal),
    staleTime: 30000,
  });
  const attempt = query.data?.data;
  const result = attempt?.result;
  useEffect(() => {
    if (attempt) heading.current?.focus();
  }, [attempt]);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <AsyncState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {attempt && result && (
        <>
          <nav aria-label="Quiz results navigation" className="flex flex-wrap gap-2">
            <Link className="action" to={'/quizzes/' + attempt.quizId}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back to quiz
            </Link>
            <Link className="action" to="/dashboard">
              Dashboard
            </Link>
            <Link className="action" to="/history">
              Study history
            </Link>
          </nav>
          <header className="surface flex flex-wrap items-center gap-5 p-5 sm:p-7">
            <div className="relative grid size-28 shrink-0 place-items-center">
              <svg
                aria-hidden="true"
                className="absolute inset-0 size-full -rotate-90"
                viewBox="0 0 112 112"
              >
                <circle
                  cx="56"
                  cy="56"
                  r="49"
                  fill="none"
                  strokeWidth="7"
                  className="stroke-edge"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="49"
                  pathLength="100"
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (result.percentage ?? 0)}
                  className="score-ring stroke-brand"
                />
              </svg>
              <span className="text-xl font-semibold tabular-nums">
                {result.percentage === null ? '—' : formatPercent(result.percentage)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 ref={heading} tabIndex={-1} className="page-title rounded">
                {attempt.quizTitle} — results
              </h1>
              <p className="mt-2 text-sm text-muted">
                Attempted version {attempt.version}
                {attempt.attemptNumber ? ' · Attempt ' + attempt.attemptNumber : ''}
                {attempt.focusedReview ? ' · Focused review' : ''} ·{' '}
                {attempt.finishedAt
                  ? new Date(attempt.finishedAt).toLocaleString()
                  : 'Completion time unavailable'}
              </p>
              <p className="mt-3 font-medium">
                {result.correctCount === result.totalQuestions
                  ? 'You answered every question correctly.'
                  : (result.percentage ?? 0) >= 70
                    ? 'You have a good grasp of this material. Review the questions you missed.'
                    : 'Review the study sources below, then retry the questions you missed.'}
              </p>
              <a
                href="#answer-review"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-text underline"
              >
                <ListChecks size={16} aria-hidden="true" />
                Review answers
              </a>
            </div>
          </header>
          <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {[
              ['Overall score', result.correctCount + ' / ' + result.totalQuestions],
              ['Total questions', result.totalQuestions],
              ['Incorrect', result.incorrectCount],
              ['Unanswered', result.unansweredCount],
              ['Time spent', formatDuration(result.elapsedMs)],
            ].map(([label, value]) => (
              <div className="surface p-4" key={label}>
                <dt className="text-xs text-muted sm:text-sm">{label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <TopicPerformance attempt={attempt} />
          <RetakeQuiz attempt={attempt} />
          <AnswerReview key={attempt.id} attempt={attempt} />
        </>
      )}
    </section>
  );
}
