import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { formatDuration, formatPercent } from '@/utils/display';
import { normalizeAnswer } from '@/utils/answer-normalization';
export default function QuizResults() {
  const { attemptId = '' } = useParams(),
    uid = useSession((state) => state.user!.uid),
    heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery({
    queryKey: [uid, 'player-results', attemptId],
    queryFn: ({ signal }) => attemptsApi.results(attemptId, signal),
    staleTime: 30000,
  });
  const attempt = query.data?.data,
    result = attempt?.result;
  useEffect(() => {
    if (attempt) heading.current?.focus();
  }, [attempt]);
  return (
    <section>
      <AsyncState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {attempt && result && (
        <>
          <Link
            className="text-sm text-teal-800 underline"
            to={'/quizzes/' + attempt.quizId}
          >
            Back to quiz
          </Link>
          <h1
            ref={heading}
            tabIndex={-1}
            className="my-5 rounded text-2xl font-semibold focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            {attempt.quizTitle} — results
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            Attempted version {attempt.version} · {attempt.mode} · completed{' '}
            {attempt.finishedAt
              ? new Date(attempt.finishedAt).toLocaleString()
              : 'time unavailable'}
          </p>
          <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['Score', formatPercent(result.percentage)],
              ['Correct', result.correctCount],
              ['Incorrect', result.incorrectCount],
              ['Unanswered', result.unansweredCount],
              ['Elapsed time', formatDuration(result.elapsedMs)],
            ].map(([label, value]) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-4"
                key={label}
              >
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-2 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-5 text-sm">
            Score uses all {result.totalQuestions} assigned questions. Unanswered
            questions earn zero and remain separate from incorrect answers. Elapsed time
            includes pauses.
          </p>
          <ol className="grid gap-4">
            {attempt.questions.map((question, index) => {
              const answer = attempt.answers.find(
                (item) => item.questionId === question.id,
              );
              const answered = Boolean(
                answer &&
                (answer.selectedOptionIds.length > 0 ||
                  Boolean(answer.text && normalizeAnswer(answer.text))),
              );
              const submitted =
                question.type === 'IDENTIFICATION'
                  ? answer?.text
                  : question.options
                      .filter((option) => answer?.selectedOptionIds.includes(option.id))
                      .map((option) => option.text)
                      .join(', ');
              const accepted =
                question.type === 'IDENTIFICATION'
                  ? question.feedback?.acceptedAnswers.join(' / ')
                  : question.options
                      .filter((option) =>
                        question.feedback?.correctOptionIds.includes(option.id),
                      )
                      .map((option) => option.text)
                      .join(', ');
              return (
                <li
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h2 className="text-lg font-semibold">
                    {index + 1}. {question.prompt}
                  </h2>
                  <p className="mt-2 font-medium">
                    {!answered
                      ? 'Unanswered'
                      : question.feedback?.isCorrect
                        ? 'Correct'
                        : 'Incorrect'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    Your answer: {answered ? submitted : 'No answer recorded'}
                  </p>
                  <p className="mt-2">Accepted answer: {accepted}</p>
                  {question.feedback?.explanation && (
                    <p className="mt-3 whitespace-pre-wrap text-sm">
                      {question.feedback.explanation}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-600">
                    Sources:{' '}
                    {question.sourceKeys
                      .map((key) => {
                        const source = attempt.sources.find(
                          (item) => item.sourceKey === key,
                        );
                        return source
                          ? source.noteTitle + ' (revision ' + source.revision + ')'
                          : key;
                      })
                      .join(', ')}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
