import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SummaryLibrary, { SummaryDetail } from '@/features/summaries/SummaryLibrary';
import { summariesApi } from '@/api/summaries';
import { resolveSession } from '@/features/auth/session.service';
import type { SavedSummary } from '@/types/study';
it('opens stored summaries, edits without generation, shows stale sources and confirms deletion', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  let saved: SavedSummary = {
    id: '22222222-2222-4222-8222-222222222222',
    projectId: '11111111-1111-4111-8111-111111111111',
    title: 'TCP',
    content: {
      title: 'TCP',
      sections: [{ heading: null, text: 'Saved transport text', sourceKeys: ['note:a'] }],
    },
    settings: { length: 'SHORT', format: 'PARAGRAPHS' },
    generatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: [
      {
        sourceKey: 'note:a',
        noteId: null,
        noteTitle: 'Original note',
        revision: 1,
        contentHash: 'hash',
        rangeStart: null,
        rangeEnd: null,
        stale: true,
      },
    ],
    staleSources: true,
  };
  let deleted = false;
  vi.spyOn(summariesApi, 'list').mockImplementation(async () => ({
    data: deleted ? [] : [saved],
    total: deleted ? 0 : 1,
    page: 1,
    pageSize: 12,
  }));
  vi.spyOn(summariesApi, 'find').mockImplementation(async () => ({ data: saved }));
  const update = vi
    .spyOn(summariesApi, 'update')
    .mockImplementation(async (_id, input) => {
      saved = { ...saved, title: input.title!, content: input.content! };
      return { data: saved };
    });
  const remove = vi.spyOn(summariesApi, 'remove').mockImplementation(async () => {
    deleted = true;
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/projects/' + saved.projectId + '/summaries']}>
        <Routes>
          <Route path="/projects/:projectId/summaries" element={<SummaryLibrary />} />
          <Route path="/summaries/:summaryId" element={<SummaryDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('link', { name: 'TCP' }));
  expect(await screen.findByText('Saved transport text')).toBeInTheDocument();
  expect(screen.getByText(/Sources changed or were removed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit summary' }));
  fireEvent.change(screen.getByLabelText('Summary title'), {
    target: { value: 'Renamed' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(update).toHaveBeenCalled());
  await screen.findByRole('heading', { name: 'Renamed' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete summary' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  await screen.findByText(/No saved summaries yet/);
  expect(remove).toHaveBeenCalledTimes(1);
});
