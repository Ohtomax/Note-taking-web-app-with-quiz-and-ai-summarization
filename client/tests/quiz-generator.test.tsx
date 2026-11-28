import './fixtures/usage';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuizGenerator } from '@/features/quizzes/QuizGenerator';
import { apiClient, GENERATION_TIMEOUT_MS } from '@/api/client';
import { studyApi } from '@/api/study';
import { resolveSession } from '@/features/auth/session.service';
import type { Generation } from '@/types/study';

afterEach(() => {
  vi.restoreAllMocks();
});
it('validates quiz settings before calls and retains them through same-key retry', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const projectId = '11111111-1111-4111-8111-111111111111';
  const settings = {
    title: 'Protocols',
    questionCount: 5,
    difficulty: 'HARD',
    questionTypes: ['IDENTIFICATION'],
    defaultMode: 'EXAM',
    includeExplanations: false,
  };
  const data: Generation = {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'SUCCEEDED',
    errorCode: null,
    resultId: null,
    result: {
      projectId,
      operation: 'QUIZ',
      settings,
      output: {
        title: 'Protocols',
        questions: Array.from({ length: 5 }, (_, index) => ({
          type: 'IDENTIFICATION',
          prompt: 'Name transport protocol ' + (index + 1),
          acceptedAnswers: ['tcp'],
          explanation: null,
          sourceKeys: ['note:a'],
        })),
      },
      sources: [
        {
          sourceKey: 'note:a',
          noteId: null,
          noteTitle: 'TCP source',
          revision: 1,
          contentHash: 'hash',
          rangeStart: null,
          rangeEnd: null,
        },
      ],
    },
  };
  const generate = vi
    .spyOn(studyApi, 'generate')
    .mockRejectedValueOnce(new Error('Timed out'))
    .mockResolvedValue({ data });
  vi.spyOn(studyApi, 'status').mockResolvedValue({ data });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuizGenerator
        projectId={projectId}
        choice={{
          projectId,
          source: { scope: 'PROJECT' },
          description: 'All active notes',
        }}
      />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText('Quiz title'), {
    target: { value: 'Protocols' },
  });
  fireEvent.click(screen.getByLabelText('Multiple choice'));
  fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(generate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Identification'));
  fireEvent.change(screen.getByLabelText('Questions'), { target: { value: 5 } });
  fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'HARD' } });
  fireEvent.change(screen.getByLabelText('Default mode'), { target: { value: 'EXAM' } });
  fireEvent.click(screen.getByLabelText('Include explanations'));
  fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Timed out'));
  fireEvent.click(screen.getByRole('button', { name: 'Retry original quiz request' }));
  await screen.findByRole('region', { name: 'Quiz preview' });
  expect(generate.mock.calls[0]![1]).toBe(generate.mock.calls[1]![1]);
  expect(generate.mock.calls[1]![2].settings).toEqual(settings);
  expect(
    screen.queryByLabelText('Question 1 accepted answers (one per line)'),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit questions' }));
  expect(screen.getByLabelText('Question 1 accepted answers (one per line)')).toHaveValue(
    'tcp',
  );
});

it('uses the extended generation timeout for quiz generation and regeneration requests', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue({
    data: {
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        status: 'RUNNING',
        errorCode: null,
        resultId: null,
        result: null,
      },
    },
  });
  const payload = {
    operation: 'QUIZ' as const,
    source: { scope: 'PROJECT' as const },
    settings: {
      title: 'Protocols',
      questionCount: 10,
      difficulty: 'MEDIUM',
      questionTypes: ['MULTIPLE_CHOICE'],
      defaultMode: 'EXAM',
      includeExplanations: true,
    },
  };
  await studyApi.generate('11111111-1111-4111-8111-111111111111', 'key-1', payload);
  await studyApi.regenerateQuiz('33333333-3333-4333-8333-333333333333', 'key-2', payload);
  expect(request).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      url: '/projects/11111111-1111-4111-8111-111111111111/generations',
      timeout: GENERATION_TIMEOUT_MS,
    }),
  );
  expect(request).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      url: '/quizzes/33333333-3333-4333-8333-333333333333/regenerate',
      timeout: GENERATION_TIMEOUT_MS,
    }),
  );
});
