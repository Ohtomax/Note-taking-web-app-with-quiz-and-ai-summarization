import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectDetail from '@/features/projects/ProjectDetail';
import { notesApi } from '@/api/notes';
import { projectsApi } from '@/api/projects';
import { resolveSession } from '@/features/auth/session.service';
import type { Note, Project } from '@/types/workspace';

const project: Project = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Networking',
  description: '',
  color: 'blue',
  icon: 'book',
  revision: 1,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const note: Note = {
  id: '22222222-2222-4222-8222-222222222222',
  projectId: project.id,
  title: 'OSI',
  revision: 1,
  pinned: false,
  archivedAt: null,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  contentSchemaVersion: 1,
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
};

it('updates note lists and project counts after pin, duplicate, archive, restore and move', async () => {
  resolveSession({ uid: 'alice', email: null, getIdToken: async () => 'token' });
  let records = [{ ...note }];
  vi.spyOn(projectsApi, 'find').mockResolvedValue({ data: project });
  vi.spyOn(projectsApi, 'list').mockResolvedValue({
    data: [
      { ...project, id: '33333333-3333-4333-8333-333333333333', title: 'Destination' },
    ],
    total: 1,
    page: 1,
    pageSize: 12,
  });
  vi.spyOn(notesApi, 'list').mockImplementation(async (_id, query) => ({
    data: records.filter((record) => Boolean(record.archivedAt) === query.archived),
    total: records.filter((record) => Boolean(record.archivedAt) === query.archived)
      .length,
    page: 1,
    pageSize: 12,
  }));
  vi.spyOn(notesApi, 'pin').mockImplementation(async (record) => {
    records = records.map((row) =>
      row.id === record.id ? { ...row, pinned: true } : row,
    );
    return { data: { ...note, pinned: true } };
  });
  vi.spyOn(notesApi, 'duplicate').mockImplementation(async () => {
    const copy = {
      ...note,
      id: '44444444-4444-4444-8444-444444444444',
      title: 'OSI copy',
    };
    records.push(copy);
    return { data: copy };
  });
  vi.spyOn(notesApi, 'archive').mockImplementation(async (record) => {
    const updated = {
      ...record,
      content: note.content,
      contentSchemaVersion: 1,
      archivedAt: record.archivedAt ? null : project.createdAt,
    };
    records = records.map((row) => (row.id === record.id ? updated : row));
    return { data: updated };
  });
  const move = vi
    .spyOn(notesApi, 'move')
    .mockImplementation(async (record, destination) => {
      records = records.filter((row) => row.id !== record.id);
      return { data: { ...note, projectId: destination } };
    });
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidation = vi.spyOn(cache, 'invalidateQueries');
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={['/projects/' + project.id]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'OSI' });
  fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
  await screen.findByRole('button', { name: 'Unpin' });
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
  const copy = await screen.findByRole('heading', { name: 'OSI copy' });
  fireEvent.click(
    within(copy.closest('article')!).getByRole('button', { name: 'Archive' }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'OSI copy' })).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
  await screen.findByRole('heading', { name: 'OSI copy' });
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  fireEvent.click(screen.getByRole('button', { name: 'Active' }));
  await screen.findByRole('heading', { name: 'OSI copy' });
  const original = screen.getByRole('heading', { name: 'OSI' });
  fireEvent.click(
    within(original.closest('article')!).getByRole('button', { name: 'Move' }),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Destination' }));
  await waitFor(() => expect(move).toHaveBeenCalled());
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['alice', 'projects'] });
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['alice', 'notes'] });
});
