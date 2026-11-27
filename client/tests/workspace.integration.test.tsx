import { fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/routes/App';
import { apiClient, apiRequest } from '@/api/client';
import { resolveSession } from '@/features/auth/session.service';
import { queryClient } from '@/config/queryClient';
import { notesApi } from '@/api/notes';
import { useDrafts } from '@/store/drafts';
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });

const enabled = Boolean(process.env.STUDY_TEST_DATABASE_URL);
let fixture: ChildProcess | undefined;
let originalBase: string | undefined;
beforeAll(async () => {
  if (!enabled) return;
  fixture = fork('tests/database/workspace-ui.fixture.ts', [], {
    cwd: resolve(process.cwd(), '../server'),
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Local API fixture timed out')),
      15000,
    );
    fixture!.once('message', (message) => {
      clearTimeout(timer);
      if (
        typeof message !== 'object' ||
        message === null ||
        !('port' in message) ||
        typeof message.port !== 'number'
      ) {
        reject(new Error('Invalid fixture port'));
        return;
      }
      resolve(message.port);
    });
    fixture!.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Fixture exited: ' + code));
    });
  });
  originalBase = apiClient.defaults.baseURL;
  apiClient.defaults.baseURL = 'http://127.0.0.1:' + port + '/api/v1';
}, 20000);
afterAll(async () => {
  if (!enabled) return;
  resolveSession(null);
  if (originalBase === undefined) delete apiClient.defaults.baseURL;
  else apiClient.defaults.baseURL = originalBase;
  if (fixture && fixture.exitCode === null) {
    await new Promise<void>((resolve) => {
      fixture!.once('exit', () => resolve());
      fixture!.send('stop');
    });
  }
});
const login = (uid: string) =>
  resolveSession({ uid, email: uid + '@example.test', getIdToken: async () => uid });

it.skipIf(!enabled)(
  'React routes create and save through real HTTP/Prisma, then isolate a second identity',
  async () => {
    login('alice');
    window.history.replaceState({}, '', '/');
    const view = render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'New project' }));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText('Project name'), {
      target: { value: 'UI private course' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Create project' }));
    fireEvent.click(await screen.findByRole('link', { name: 'UI private course' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New note' }));
    const title = await screen.findByLabelText('Note title');
    await screen.findByRole('textbox', { name: 'Note content' });
    fireEvent.change(title, { target: { value: 'UI private note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save note' })).toBeEnabled(),
    );
    await screen.findByText('Saved');
    const path = window.location.pathname;
    const [, , projectId, , noteId] = path.split('/');
    expect(projectId).toBeDefined();
    expect(noteId).toBeDefined();
    const reopened = await notesApi.find(projectId!, noteId!);
    expect(reopened.data.title).toBe('UI private note');
    fireEvent.click(screen.getByRole('link', { name: 'Back to project' }));
    fireEvent.click(await screen.findByRole('link', { name: 'UI private note' }));
    expect(await screen.findByDisplayValue('UI private note')).toBeInTheDocument();
    act(() => login('bob'));
    await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(screen.queryByDisplayValue('UI private note')).not.toBeInTheDocument();
    expect(useDrafts.getState().drafts).toEqual({});
    expect(
      queryClient
        .getQueryCache()
        .findAll()
        .some((query) => query.queryKey[0] === 'alice'),
    ).toBe(false);
    await expect(apiRequest('/projects/' + projectId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      apiRequest(path, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Forbidden',
          expectedRevision: reopened.data.revision,
        }),
      }),
    ).rejects.toMatchObject({ status: 404 });
    act(() => login('alice'));
    expect((await notesApi.find(projectId!, noteId!)).data).toEqual(reopened.data);
    view.unmount();
  },
  20000,
);
