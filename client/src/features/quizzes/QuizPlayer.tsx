import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, LogOut } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAttempt } from './attemptQueries';
import { attemptsApi } from '@/api/attempts';
import { useSession } from '@/store/session';
import { useDrafts } from '@/store/drafts';
import { AsyncState } from '@/components/ui/AsyncState';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { normalizeAnswer } from '@/utils/answer-normalization';
import type { PlayerAttempt, PlayerQuestion, SaveAnswerInput } from '@/types/attempts';

type Destination = 'next' | 'previous' | 'submit' | 'exit';

function QuestionPane({
  attempt,
  question,
}: {
  attempt: PlayerAttempt;
  question: PlayerQuestion;
}) {
  const uid = useSession((state) => state.user!.uid);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirmation, setConfirmation] = useState<'submit' | 'exit' | null>(null);
  const recorded = attempt.answers.find((answer) => answer.questionId === question.id);
  const draftKey = [attempt.id, question.id, recorded?.revision ?? 0].join(':');
  const draft = useDrafts((state) => state.quizAnswers[draftKey]);
  const options = draft?.optionIds ?? recorded?.selectedOptionIds ?? [];
  const text = draft?.text ?? recorded?.text ?? '';
  const dirty = Boolean(draft);
  const index = attempt.lastQuestionIndex;
  const final = index === attempt.totalQuestions - 1;
  const hasAnswer =
    question.type === 'IDENTIFICATION'
      ? Boolean(normalizeAnswer(text))
      : options.length > 0;
  const recordedCount = attempt.answers.filter(
    (answer) => answer.selectedOptionIds.length || normalizeAnswer(answer.text ?? ''),
  ).length;
  const answeredCount =
    recordedCount +
    Number(hasAnswer) -
    Number(
      Boolean(
        recorded &&
        (recorded.selectedOptionIds.length || normalizeAnswer(recorded.text ?? '')),
      ),
    );
  const updateDraft = (value: Pick<SaveAnswerInput, 'optionIds' | 'text'>) =>
    useDrafts
      .getState()
      .setQuizAnswer(draftKey, {
        ...value,
        expectedAnswerRevision: recorded?.revision ?? 0,
      });

  useEffect(() => {
    heading.current?.focus();
  }, [question.id]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const replace = (response: { data: PlayerAttempt }) => {
    cache.setQueryData([uid, 'player-attempt', attempt.id], response);
    void cache.invalidateQueries({ queryKey: [uid, 'open-attempts'] });
  };
  const advance = useMutation({
    mutationFn: async (destination: Destination) => {
      const questionIndex =
        destination === 'previous'
          ? index - 1
          : destination === 'next'
            ? index + 1
            : undefined;
      if (draft) {
        const saved = await attemptsApi.saveAnswer(attempt.id, question.id, {
          ...draft,
          questionIndex,
        });
        if (useSession.getState().user?.uid !== uid) return;
        useDrafts.getState().removeQuizAnswer(draftKey);
        replace(saved);
      } else if (questionIndex !== undefined) {
        const moved = await attemptsApi.locate(attempt.id, questionIndex);
        if (useSession.getState().user?.uid !== uid) return;
        replace(moved);
      }
      if (destination === 'submit' && useSession.getState().user?.uid === uid) {
        const result = await attemptsApi.submit(attempt.id);
        if (useSession.getState().user?.uid !== uid) return;
        cache.setQueryData([uid, 'player-results', attempt.id], result);
        for (const domain of ['history', 'analytics', 'dashboard']) {
          void cache.invalidateQueries({ queryKey: [uid, domain] });
        }
        // Navigate before the player renders its completed fallback.
        void navigate('/attempts/' + attempt.id + '/results', { replace: true });
        replace(result);
      }
      if (destination === 'exit' && useSession.getState().user?.uid === uid)
        void navigate('/quizzes/' + attempt.quizId, { replace: true });
    },
  });
  const busy = advance.isPending;

  return (
    <section aria-labelledby="quiz-title" className="mx-auto max-w-3xl">
      <header className="mb-5 flex items-start justify-between gap-3 sm:mb-7">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-text">
            <BookOpen size={17} aria-hidden="true" />
            Quiz session
          </p>
          <h1
            id="quiz-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {attempt.quizTitle}
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <ThemeToggle />
          <button
            className="action shrink-0"
            disabled={busy}
            onClick={() => {
              advance.reset();
              setConfirmation('exit');
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Exit quiz
          </button>
        </div>
      </header>
      <div className="surface p-4 sm:p-8">
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-muted sm:text-sm">
          <span>
            Question {index + 1} of {attempt.totalQuestions}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <progress
          aria-label="Quiz progress"
          className="quiz-progress mb-6 h-2 w-full"
          value={index + 1}
          max={attempt.totalQuestions}
        />
        <h2
          ref={heading}
          tabIndex={-1}
          className="mb-6 rounded-md text-xl leading-snug font-semibold tracking-tight sm:text-2xl"
        >
          {question.prompt}
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!hasAnswer || busy) return;
            if (final) {
              advance.reset();
              setConfirmation('submit');
            } else advance.mutate('next');
          }}
        >
          <fieldset disabled={busy} className="grid gap-2.5">
            <legend className="mb-3 text-sm font-medium text-muted">
              {question.type === 'MULTIPLE_SELECT'
                ? 'Select all matching answers'
                : 'Your answer'}
            </legend>
            {question.type === 'IDENTIFICATION' ? (
              <label className="grid gap-2 text-sm">
                <span className="sr-only">Identification answer</span>
                <input
                  className="field w-full"
                  maxLength={500}
                  placeholder="Type your answer…"
                  value={text}
                  onChange={(event) => updateDraft({ text: event.target.value })}
                />
              </label>
            ) : (
              question.options.map((option, position) => {
                const selected = options.includes(option.id);
                return (
                  <label
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-edge bg-panel p-3 text-sm font-medium transition hover:border-brand has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand sm:text-base"
                    key={option.id}
                  >
                    <input
                      className="sr-only"
                      type={question.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                      name={'question-' + question.id}
                      checked={selected}
                      onChange={() =>
                        updateDraft({
                          optionIds:
                            question.type !== 'MULTIPLE_SELECT'
                              ? [option.id]
                              : selected
                                ? options.filter((id) => id !== option.id)
                                : [...options, option.id],
                        })
                      }
                    />
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${selected ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}
                      aria-hidden="true"
                    >
                      {selected ? (
                        <Check size={16} />
                      ) : (
                        String.fromCharCode(65 + position)
                      )}
                    </span>
                    <span>{option.text}</span>
                  </label>
                );
              })
            )}
          </fieldset>
          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-edge pt-4">
            <button
              type="button"
              className="action"
              disabled={busy || index === 0}
              onClick={() => advance.mutate('previous')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Previous question
            </button>
            <button className="action action-primary" disabled={busy || !hasAnswer}>
              {busy ? 'Saving…' : final ? 'Submit quiz' : 'Next question'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
        {advance.error && !confirmation && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {advance.error.message}
          </p>
        )}
      </div>
      {confirmation && (
        <Modal
          title={confirmation === 'submit' ? 'Submit this quiz?' : 'Exit this quiz?'}
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          <p className="text-sm text-muted">
            {confirmation === 'exit'
              ? 'Your current answer will be saved. You can resume this quiz from its page.'
              : answeredCount === attempt.totalQuestions
                ? 'Your answers will be graded and you can review the results.'
                : attempt.totalQuestions -
                  answeredCount +
                  ' questions are unanswered and will count as skipped.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="action action-primary"
              disabled={busy}
              onClick={() => advance.mutate(confirmation)}
            >
              {confirmation === 'submit' ? 'Confirm submission' : 'Save and exit'}
            </button>
            <button
              className="action"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Keep studying
            </button>
          </div>
          {advance.error && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
              {advance.error.message}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}

export default function QuizPlayer() {
  const { attemptId = '' } = useParams();
  const query = useAttempt(attemptId);
  const attempt = query.data?.data;
  const question = attempt?.questions[attempt.lastQuestionIndex];
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <AsyncState
          loading={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {attempt?.status === 'IN_PROGRESS' && question && (
          <QuestionPane key={question.id} attempt={attempt} question={question} />
        )}
        {attempt && attempt.status !== 'IN_PROGRESS' && (
          <section className="surface space-y-3 p-6">
            <h1 className="page-title">{attempt.quizTitle}</h1>
            <p role="status">
              {attempt.status === 'COMPLETED' ? 'Attempt completed' : 'Attempt abandoned'}
            </p>
            <Link
              className="action action-primary"
              to={
                attempt.status === 'COMPLETED'
                  ? '/attempts/' + attempt.id + '/results'
                  : '/quizzes/' + attempt.quizId
              }
            >
              {attempt.status === 'COMPLETED'
                ? 'View results and answer review'
                : 'Back to quiz'}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
