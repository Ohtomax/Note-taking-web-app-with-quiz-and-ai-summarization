import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectLibrary from '@/features/projects/ProjectLibrary';
import { projectsApi } from '@/api/projects';
import { resolveSession } from '@/features/auth/session.service';
import { projectPageSchema, type Project } from '@/types/workspace';

const original: Project = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Networking',
  description: '',
  color: 'blue',
  icon: 'book',
  revision: 1,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  noteCount: 0,
};
let records: Project[];
beforeEach(() => {
  resolveSession({
    uid: 'alice',
    email: 'alice@example.test',
    getIdToken: async () => 'token',
  });
  records = [{ ...original }];
  vi.spyOn(projectsApi, 'list').mockImplementation(async (query) => {
    const data = records.filter(
      (project) =>
        Boolean(project.archivedAt) === query.archived &&
        project.title.toLowerCase().includes(query.search.toLowerCase()),
    );
    return { data, total: data.length, page: query.page, pageSize: query.pageSize };
  });
  vi.spyOn(projectsApi, 'create').mockImplementation(async (input) => {
    const project = { ...original, ...input, id: '22222222-2222-4222-8222-222222222222' };
    records.push(project);
    return { data: project };
  });
  vi.spyOn(projectsApi, 'update').mockImplementation(async (id, input) => {
    const project = {
      ...records.find((record) => record.id === id)!,
      ...input,
      revision: 2,
    };
    records = records.map((record) => (record.id === id ? project : record));
    return { data: project };
  });
  vi.spyOn(projectsApi, 'archive').mockImplementation(async (id, archived) => {
    const project = {
      ...records.find((record) => record.id === id)!,
      archivedAt: archived ? original.createdAt : null,
    };
    records = records.map((record) => (record.id === id ? project : record));
    return { data: project };
  });
  vi.spyOn(projectsApi, 'preview').mockResolvedValue({
    data: {
      projectId: original.id,
      title: original.title,
      impactRevision: 1,
      notes: 2,
      summaries: 1,
      quizzes: 1,
      retainedAttempts: 3,
    },
  });
});

const openLibrary = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ProjectLibrary />
      </MemoryRouter>
    </QueryClientProvider>,
  );

it('creates and edits projects with cache invalidation, then archives and restores', async () => {
  openLibrary();
  await screen.findByRole('heading', { name: 'Networking' });
  fireEvent.click(screen.getByRole('button', { name: 'New project' }));
  fireEvent.change(screen.getByLabelText('Project name'), {
    target: { value: 'Course' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
  const course = await screen.findByRole('heading', { name: 'Course' });
  fireEvent.click(
    within(course.closest('article')!).getByRole('button', { name: 'Edit' }),
  );
  fireEvent.change(screen.getByLabelText('Project name'), {
    target: { value: 'Renamed course' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
  const renamed = await screen.findByRole('heading', { name: 'Renamed course' });
  fireEvent.click(
    within(renamed.closest('article')!).getByRole('button', { name: 'Archive' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Renamed course' }),
    ).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
  const archived = await screen.findByRole('heading', { name: 'Renamed course' });
  fireEvent.click(
    within(archived.closest('article')!).getByRole('button', { name: 'Restore' }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Renamed course' }),
    ).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Active' }));
  expect(
    await screen.findByRole('heading', { name: 'Renamed course' }),
  ).toBeInTheDocument();
});

it('shows deletion impact and cancellation makes no delete request', async () => {
  const remove = vi.spyOn(projectsApi, 'remove').mockResolvedValue();
  openLibrary();
  await screen.findByRole('heading', { name: 'Networking' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByText(/3 historical attempts/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(remove).not.toHaveBeenCalled();
  expect(projectPageSchema.safeParse({ data: [{ id: 'bad' }] }).success).toBe(false);
});
