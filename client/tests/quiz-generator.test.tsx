import './fixtures/usage';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuizGenerator } from '@/features/quizzes/QuizGenerator';
import { studyApi } from '@/api/study';
import { resolveSession } from '@/features/auth/session.service';
import type { Generation } from '@/types/study';
it('validates quiz settings before calls and retains them through same-key retry', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const projectId = '11111111-1111-4111-8111-111111111111';
  const settings = {
    title: 'Protocols',
    questionCount: 1,
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
        questions: [
          {
            type: 'IDENTIFICATION',
            prompt: 'Name the transport protocol',
            acceptedAnswers: ['tcp'],
            explanation: null,
            sourceKeys: ['note:a'],
          },
        ],
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
  fireEvent.click(screen.getByLabelText('MULTIPLE CHOICE'));
  fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(generate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('IDENTIFICATION'));
  fireEvent.change(screen.getByLabelText('Questions'), { target: { value: 1 } });
  fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'HARD' } });
  fireEvent.change(screen.getByLabelText('Default mode'), { target: { value: 'EXAM' } });
  fireEvent.click(screen.getByLabelText('Include explanations'));
  fireEvent.click(screen.getByRole('button', { name: 'Generate quiz' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Timed out'));
  fireEvent.click(screen.getByRole('button', { name: 'Retry original quiz request' }));
  await screen.findByRole('region', { name: 'Quiz preview' });
  expect(generate.mock.calls[0]![1]).toBe(generate.mock.calls[1]![1]);
  expect(generate.mock.calls[1]![2].settings).toEqual(settings);
  expect(screen.getByLabelText('Question 1 accepted answers (one per line)')).toHaveValue(
    'tcp',
  );
});
