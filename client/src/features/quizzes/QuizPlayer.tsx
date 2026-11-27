import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAttempt } from './attemptQueries';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import { AsyncState } from '@/components/ui/AsyncState';
import { Modal } from '@/components/ui/Modal';
import { normalizeAnswer } from '@/utils/answer-normalization';
import type { PlayerAttempt, PlayerQuestion, SaveAnswerInput } from '@/types/attempts';
interface QuestionPaneProps {
  attempt: PlayerAttempt;
  question: PlayerQuestion;
  busy: boolean;
  error: Error | null;
  onSave: (input: SaveAnswerInput) => void;
  onNavigate: (index: number) => void;
  onFinish: () => void;
  onReload: () => void;
}
function QuestionPane({
  attempt,
  question,
  busy,
  error,
  onSave,
  onNavigate,
  onFinish,
  onReload,
}: QuestionPaneProps) {
  const recorded = attempt.answers.find((answer) => answer.questionId === question.id);
  const [options, setOptions] = useState<string[]>(recorded?.selectedOptionIds ?? []),
    [text, setText] = useState(recorded?.text ?? ''),
    [dirty, setDirty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [question.id]);
  const locked = attempt.mode === 'PRACTICE' && Boolean(recorded);
  const hasAnswer =
    question.type === 'IDENTIFICATION'
      ? Boolean(normalizeAnswer(text))
      : options.length > 0;
  const answered = attempt.answers.filter(
    (answer) =>
      answer.selectedOptionIds.length > 0 ||
      Boolean(answer.text && normalizeAnswer(answer.text)),
  ).length;
  const index = attempt.questions.findIndex((item) => item.id === question.id);
  const save = () =>
    onSave({
      expectedAnswerRevision: recorded?.revision ?? 0,
      ...(question.type === 'IDENTIFICATION' ? { text } : { optionIds: options }),
    });
  return (
    <section>
      <p className="mb-2 text-sm text-slate-600">
        {attempt.mode} · version {attempt.version} · {answered} of{' '}
        {attempt.totalQuestions} answered
      </p>
      <progress
        aria-label="Answered questions"
        className="mb-5 h-3 w-full accent-teal-700"
        value={answered}
        max={attempt.totalQuestions}
      />
      <h2
        ref={heading}
        tabIndex={-1}
        className="mb-4 rounded text-xl font-semibold focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        Question {index + 1} of {attempt.totalQuestions}: {question.prompt}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset disabled={busy || locked} className="grid gap-3">
          <legend className="mb-3 text-sm font-medium">
            {question.type === 'MULTIPLE_SELECT'
              ? 'Select all matching answers'
              : 'Your answer'}
          </legend>
          {question.type === 'IDENTIFICATION' ? (
            <label className="grid gap-2 text-sm">
              Identification answer
              <input
                className="rounded border border-slate-300 bg-white p-3"
                maxLength={500}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setDirty(true);
                }}
              />
            </label>
          ) : (
            question.options.map((option) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded border border-slate-300 bg-white p-3"
                key={option.id}
              >
                <input
                  type={question.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                  name={'question-' + question.id}
                  checked={options.includes(option.id)}
                  onChange={() => {
                    setOptions((current) =>
                      question.type === 'MULTIPLE_SELECT'
                        ? current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id]
                        : [option.id],
                    );
                    setDirty(true);
                  }}
                />
                {option.text}
              </label>
            ))
          )}
        </fieldset>
        <div className="my-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
            disabled={
              busy || locked || !dirty || (attempt.mode === 'PRACTICE' && !hasAnswer)
            }
          >
            {locked
              ? 'Answer recorded'
              : attempt.mode === 'PRACTICE'
                ? 'Submit practice answer'
                : 'Save answer'}
          </button>
          {attempt.mode === 'EXAM' && hasAnswer && (
            <button
              type="button"
              className="underline disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                setOptions([]);
                setText('');
                setDirty(true);
              }}
            >
              Clear answer
            </button>
          )}
          {dirty && (
            <>
              <span role="status" className="text-sm text-amber-800">
                Unsaved answer. Save or discard before navigating.
              </span>
              <button
                type="button"
                disabled={busy}
                className="underline"
                onClick={() => {
                  setOptions(recorded?.selectedOptionIds ?? []);
                  setText(recorded?.text ?? '');
                  setDirty(false);
                }}
              >
                Discard changes
              </button>
            </>
          )}
        </div>
      </form>
      {question.feedback && (
        <div role="status" className="my-4 rounded border border-teal-300 bg-teal-50 p-4">
          <h3 className="font-semibold">
            {question.feedback.isCorrect ? 'Correct' : 'Incorrect'}
          </h3>
          <p className="mt-2 text-sm">
            Accepted answer:{' '}
            {question.type === 'IDENTIFICATION'
              ? question.feedback.acceptedAnswers.join(' / ')
              : question.options
                  .filter((option) =>
                    question.feedback!.correctOptionIds.includes(option.id),
                  )
                  .map((option) => option.text)
                  .join(', ')}
          </p>
          {question.feedback.explanation && (
            <p className="mt-2 text-sm">{question.feedback.explanation}</p>
          )}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="my-4 rounded border border-red-300 p-3 text-sm text-red-700"
        >
          <p>{error.message}</p>
          <p className="mt-1">
            Reloading the saved answer replaces any unsaved selection.
          </p>
          <button className="mt-2 underline" onClick={onReload}>
            Reload saved answer
          </button>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded border border-slate-300 px-4 py-2 disabled:opacity-50"
          disabled={busy || dirty || index === 0}
          onClick={() => onNavigate(index - 1)}
        >
          Previous question
        </button>
        <button
          className="rounded border border-slate-300 px-4 py-2 disabled:opacity-50"
          disabled={busy || dirty || index === attempt.totalQuestions - 1}
          onClick={() => onNavigate(index + 1)}
        >
          Next question
        </button>
        <button
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy || dirty}
          onClick={onFinish}
        >
          {attempt.mode === 'EXAM' ? 'Submit exam' : 'Finish practice'}
        </button>
      </div>
    </section>
  );
}
export default function QuizPlayer() {
  const { attemptId = '' } = useParams(),
    query = useAttempt(attemptId),
    uid = useSession((state) => state.user!.uid),
    cache = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const replace = (response: { data: PlayerAttempt }) => {
    if (useSession.getState().user?.uid !== uid) return;
    cache.setQueryData([uid, 'player-attempt', attemptId], response);
    void cache.invalidateQueries({ queryKey: [uid, 'open-attempts'] });
  };
  const answer = useMutation({
    mutationFn: (input: { questionId: string; answer: SaveAnswerInput }) =>
      attemptsApi.saveAnswer(attemptId, input.questionId, input.answer),
    onSuccess: replace,
  });
  const location = useMutation({
    mutationFn: (index: number) => attemptsApi.locate(attemptId, index),
    onSuccess: replace,
  });
  const submit = useMutation({
    mutationFn: () => attemptsApi.submit(attemptId),
    onSuccess: (response) => {
      replace(response);
      setConfirm(false);
      for (const domain of ['history', 'analytics', 'dashboard'])
        void cache.invalidateQueries({ queryKey: [uid, domain] });
    },
  });
  const attempt = query.data?.data;
  const question =
    attempt?.questions[Math.min(attempt.lastQuestionIndex, attempt.questions.length - 1)];
  const busy = answer.isPending || location.isPending || submit.isPending;
  const answered =
    attempt?.answers.filter(
      (item) =>
        item.selectedOptionIds.length > 0 ||
        Boolean(item.text && normalizeAnswer(item.text)),
    ).length ?? 0;
  return (
    <section>
      <AsyncState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {attempt && (
        <>
          <Link
            className="text-sm text-teal-800 underline"
            to={'/quizzes/' + attempt.quizId}
          >
            Back to quiz
          </Link>
          <h1 className="my-5 text-2xl font-semibold">{attempt.quizTitle}</h1>
          {attempt.status === 'ABANDONED' ? (
            <p role="status">
              Attempt abandoned. Recorded answers are read-only and have no completed
              score.
            </p>
          ) : attempt.status === 'COMPLETED' ? (
            <div role="status">
              <h2 className="text-xl font-semibold">Attempt completed</h2>
              <p className="mt-3">
                Score: {attempt.result?.percentage?.toFixed(2) ?? 'Unavailable'}%
              </p>
            </div>
          ) : (
            question && (
              <QuestionPane
                key={
                  question.id +
                  ':' +
                  (attempt.answers.find((item) => item.questionId === question.id)
                    ?.revision ?? 0)
                }
                attempt={attempt}
                question={question}
                busy={busy}
                error={answer.error ?? location.error ?? submit.error}
                onSave={(input) =>
                  answer.mutate({ questionId: question.id, answer: input })
                }
                onNavigate={(index) => location.mutate(index)}
                onFinish={() => setConfirm(true)}
                onReload={() => {
                  answer.reset();
                  location.reset();
                  submit.reset();
                  void query.refetch();
                }}
              />
            )
          )}
          {confirm && (
            <Modal
              title={
                attempt.mode === 'EXAM' ? 'Submit this exam?' : 'Finish this practice?'
              }
              busy={submit.isPending}
              onClose={() => setConfirm(false)}
            >
              <p>
                {attempt.totalQuestions - answered} unanswered questions will count as
                skipped. Answers cannot be changed after final submission.
              </p>
              <div className="mt-4 flex gap-4">
                <button
                  className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  Confirm submission
                </button>
                <button
                  className="underline"
                  disabled={submit.isPending}
                  onClick={() => setConfirm(false)}
                >
                  Keep reviewing
                </button>
              </div>
              {submit.error && (
                <p role="alert" className="mt-3 text-red-700">
                  {submit.error.message}
                </p>
              )}
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
