import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuizLibrary from '@/features/quizzes/QuizLibrary';
import { quizzesApi } from '@/api/quizzes';
import { resolveSession } from '@/features/auth/session.service';
import type { QuizVersion } from '@/types/quiz-library';
it('duplicates independently, renames and confirms deletion with historical retention feedback', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  const projectId = '11111111-1111-4111-8111-111111111111',
    id = '22222222-2222-4222-8222-222222222222',
    copyId = '33333333-3333-4333-8333-333333333333',
    versionId = '44444444-4444-4444-8444-444444444444',
    stamp = '2026-01-01T00:00:00.000Z';
  const header = {
    id: versionId,
    version: 1,
    difficulty: 'EASY' as const,
    generatedAt: stamp,
    _count: { questions: 1 },
  };
  const original = {
    id,
    projectId,
    title: 'Protocols',
    createdAt: stamp,
    updatedAt: stamp,
    versions: [header],
  };
  let records = [original];
  vi.spyOn(quizzesApi, 'list').mockImplementation(async () => ({
    data: records,
    total: records.length,
    page: 1,
    pageSize: 12,
  }));
  const full: QuizVersion = {
    id: versionId,
    quizId: copyId,
    version: 1,
    difficulty: 'EASY',
    defaultMode: 'PRACTICE',
    includeExplanations: false,
    generatedAt: stamp,
    promptVersion: 'copy',
    sources: [],
    questions: [],
  };
  const duplicate = vi.spyOn(quizzesApi, 'duplicate').mockImplementation(async () => {
    records = [...records, { ...original, id: copyId, title: 'Protocols copy' }];
    return { data: { id: copyId, title: 'Protocols copy', projectId, versions: [full] } };
  });
  vi.spyOn(quizzesApi, 'rename').mockImplementation(async (quizId, title) => {
    records = records.map((record) =>
      record.id === quizId ? { ...record, title } : record,
    );
    return { data: { id: quizId, title, projectId, updatedAt: stamp } };
  });
  const remove = vi.spyOn(quizzesApi, 'remove').mockImplementation(async (quizId) => {
    records = records.filter((record) => record.id !== quizId);
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/projects/' + projectId + '/quizzes']}>
        <Routes>
          <Route path="/projects/:projectId/quizzes" element={<QuizLibrary />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Protocols' }));
  await screen.findByRole('link', { name: 'Protocols copy' });
  expect(duplicate).toHaveBeenCalledWith(id, 1);
  fireEvent.click(
    within(screen.getByRole('link', { name: 'Protocols' }).closest('li')!).getByRole(
      'button',
      { name: 'Rename' },
    ),
  );
  fireEvent.change(screen.getByLabelText('Quiz title'), {
    target: { value: 'Edited protocols' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await screen.findByRole('link', { name: 'Edited protocols' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete Edited protocols' }));
  expect(screen.getByText(/Historical attempts retain/)).toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('link', { name: 'Edited protocols' }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('link', { name: 'Protocols copy' })).toBeInTheDocument();
});
