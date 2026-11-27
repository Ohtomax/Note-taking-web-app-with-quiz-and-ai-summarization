import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuizHistory from '@/features/quiz-history/QuizHistory';
import { historyApi } from '@/api/history';
import { resolveSession } from '@/features/auth/session.service';
import { fixtureId } from './fixtures/attempt';
import type { HistoryEntry } from '@/types/history';
it('shows incomplete status, version-aware comparison and empty filtered project history', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const stamp = '2026-01-01T00:00:00.000Z',
    projectId = fixtureId(3);
  const entry: HistoryEntry = {
    id: fixtureId(1),
    versionId: fixtureId(4),
    version: 1,
    quizId: fixtureId(2),
    quizTitle: 'Protocols',
    projectId,
    projectTitle: 'Networks',
    quizDeleted: false,
    projectDeleted: false,
    difficulty: 'MEDIUM',
    mode: 'EXAM',
    status: 'COMPLETED',
    startedAt: stamp,
    finishedAt: stamp,
    lastQuestionIndex: 0,
    totalQuestions: 4,
    correctCount: 2,
    answeredCount: 4,
    percentage: 50,
    elapsedMs: 1000,
  };
  const incomplete = {
    ...entry,
    id: fixtureId(5),
    status: 'IN_PROGRESS' as const,
    correctCount: null,
    answeredCount: null,
    percentage: null,
    elapsedMs: null,
    finishedAt: null,
  };
  const list = vi
    .spyOn(historyApi, 'list')
    .mockImplementation(async (query) => ({
      data: query.status === 'ABANDONED' ? [] : [entry, incomplete],
      total: query.status === 'ABANDONED' ? 0 : 2,
      page: 1,
      pageSize: 12,
    }));
  const selected = {
    id: entry.id,
    versionId: entry.versionId,
    version: 1,
    status: 'COMPLETED' as const,
    mode: entry.mode,
    startedAt: stamp,
    finishedAt: stamp,
    percentage: 50,
    elapsedMs: 1000,
  };
  vi.spyOn(historyApi, 'comparison').mockResolvedValue({
    data: {
      quizId: entry.quizId,
      quizTitle: 'Protocols',
      attemptCount: 3,
      bestScore: 75,
      first: { ...selected, percentage: 25 },
      selected,
      latest: { ...selected, version: 2, percentage: 75 },
    },
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/projects/' + projectId + '/history']}>
        <Routes>
          <Route path="/projects/:projectId/history" element={<QuizHistory />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText(/In progress · saved at question 1/);
  expect(list.mock.calls[0]![0].projectId).toBe(projectId);
  fireEvent.click(screen.getAllByRole('button', { name: 'Compare attempt' })[0]!);
  await screen.findByRole('table', { name: 'Attempt comparison' });
  expect(screen.getByRole('link', { name: '25.00%' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '75.00%' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Attempt status'), {
    target: { value: 'ABANDONED' },
  });
  expect(
    await screen.findByText('No attempts match this history view.'),
  ).toBeInTheDocument();
});
