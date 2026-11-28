import { fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeEach, afterEach, it, expect } from 'vitest';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/routes/App';
import { queryClient } from '@/config/queryClient';
import { apiClient, apiRequest } from '@/api/client';
import { resolveSession } from '@/features/auth/session.service';
import { quizzesApi } from '@/api/quizzes';
import { attemptsApi } from '@/api/attempts';
import { historyApi } from '@/api/history';
import { analyticsApi } from '@/api/analytics';
import { dashboardApi } from '@/api/dashboard';
import { usageApi } from '@/api/usage';
import { z } from 'zod';
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });
const enabled = Boolean(process.env.STUDY_TEST_DATABASE_URL);
let fixture: ChildProcess | undefined,
  projectId = '',
  originalBase: string | undefined;
const login = (uid: string) =>
  resolveSession({ uid, email: uid + '@example.test', getIdToken: async () => uid });
beforeEach(async () => {
  if (!enabled) return;
  fixture = fork('tests/database/study-ui.fixture.ts', [], {
    cwd: resolve(process.cwd(), '../server'),
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const info = await new Promise<{ port: number; projectId: string }>(
    (resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Study fixture timed out')), 15000);
      fixture!.once('message', (message) => {
        clearTimeout(timer);
        resolve(
          z.object({ port: z.number(), projectId: z.string().uuid() }).parse(message),
        );
      });
      fixture!.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Fixture exit ' + code));
      });
    },
  );
  projectId = info.projectId;
  originalBase = apiClient.defaults.baseURL;
  apiClient.defaults.baseURL = 'http://127.0.0.1:' + info.port + '/api/v1';
  login('alice');
}, 20000);
afterEach(async () => {
  if (!enabled) return;
  cleanup();
  resolveSession(null);
  if (originalBase === undefined) delete apiClient.defaults.baseURL;
  else apiClient.defaults.baseURL = originalBase;
  if (fixture && fixture.exitCode === null)
    await new Promise<void>((resolve) => {
      fixture!.once('exit', () => resolve());
      fixture!.send('stop');
    });
});
it.skipIf(!enabled).each([1, 2])(
  'reconciles a complete React/HTTP/Prisma mock-provider study session from clean fixture %s',
  async () => {
    let view: ReturnType<typeof render> | undefined;
    const visit = async (path: string) => {
      view?.unmount();
      window.history.replaceState({}, '', path);
      view = render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>,
      );
    };
    await visit('/projects/' + projectId);
    const summaryButton = await screen.findByRole('button', {
      name: 'Generate summary',
      hidden: true,
    });
    fireEvent.click(screen.getByText('Choose study sources'));
    fireEvent.click(summaryButton);
    await screen.findByRole('region', { name: 'Summary preview' });
    fireEvent.click(screen.getByRole('button', { name: 'Save summary' }));
    await screen.findByRole('button', { name: 'Summary saved' });
    const generator = screen.getByRole('region', { name: 'Generate quiz' });
    fireEvent.change(within(generator).getByLabelText('Quiz title'), {
      target: { value: 'Session protocols' },
    });

    fireEvent.click(within(generator).getByRole('button', { name: 'Generate quiz' }));
    const preview = await screen.findByRole('region', { name: 'Quiz preview' });
    fireEvent.click(within(preview).getByRole('button', { name: 'Save quiz' }));
    await screen.findByRole('link', { name: 'Open saved version' });
    const list = await quizzesApi.list(projectId, 1, '');
    expect(list.total).toBe(1);
    const quizId = list.data[0]!.id;
    await visit('/quizzes/' + quizId);
    fireEvent.click(await screen.findByRole('button', { name: 'Practice version 1' }));
    await screen.findByText('Question 1 of 10');
    const practiceId = window.location.pathname.split('/')[2]!;
    const complete = async (correct: boolean) => {
      for (let index = 0; index < 10; index++) {
        await screen.findByText('Question ' + (index + 1) + ' of 10');
        fireEvent.click(
          screen.getByRole('radio', { name: correct && index < 5 ? 'TCP' : 'UDP' }),
        );
        expect(screen.queryByText(/Accepted answer:/)).not.toBeInTheDocument();
        fireEvent.click(
          screen.getByRole('button', {
            name: index === 9 ? 'Submit quiz' : 'Next question',
          }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: 'Confirm submission' }));
      await screen.findByRole('heading', { name: /Session protocols — results/ });
    };
    await complete(true);
    await visit('/quizzes/' + quizId);
    fireEvent.click(await screen.findByRole('button', { name: 'Exam version 1' }));
    await screen.findByText('Question 1 of 10');
    const examId = window.location.pathname.split('/')[2]!;
    await complete(false);
    await visit('/attempts/' + practiceId + '/results');
    await screen.findByRole('heading', { name: /Session protocols — results/ });
    expect(screen.getByText('50.00%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retake this version' }));
    await screen.findByText('Question 1 of 10');
    const retakeId = window.location.pathname.split('/')[2]!;
    expect(new Set([practiceId, examId, retakeId]).size).toBe(3);
    await complete(true);
    const history = await historyApi.list({ page: 1 });
    expect(history.total).toBe(3);
    expect((await attemptsApi.results(examId)).data.result!.percentage).toBe(0);
    for (const scope of [{}, { projectId }, { quizId }]) {
      const report = await analyticsApi.read(scope, {});
      expect(report.totals.completedAttempts).toBe(3);
      expect(report.totals.meanScore).toBeCloseTo(100 / 3);
      expect(report.totals.accuracy).toBeCloseTo(100 / 3);
      expect(report.totals.skipped).toBe(0);
    }
    const dashboard = await dashboardApi.read();
    expect(dashboard.performance.workspace).toMatchObject({
      projects: 1,
      notes: 1,
      summaries: 1,
      quizzes: 1,
    });
    const usage = await usageApi.read();
    expect(usage.quota.requestsUsed).toBe(2);
    for (const path of [
      '/analytics',
      '/projects/' + projectId + '/analytics',
      '/quizzes/' + quizId + '/analytics',
    ]) {
      await visit(path);
      await screen.findByRole('heading', { name: /Study analytics ·/ });
      expect(screen.getAllByText('33.33%').length).toBeGreaterThan(0);
    }
    await visit('/history');
    await screen.findByRole('heading', { name: /Study history/ });
    expect(await screen.findAllByRole('link', { name: 'Review / retake' })).toHaveLength(
      3,
    );
    await visit('/dashboard');
    await screen.findByText(/Welcome back/);
    await screen.findByRole('link', { name: 'Session summary' });
    const stats = await new Promise<unknown>((resolve) => {
      fixture!.once('message', resolve);
      fixture!.send('stats');
    });
    expect(stats).toEqual({ calls: 2, attempts: 3, requests: 2 });
    act(() => login('bob'));
    await screen.findByText('No attempts yet. Save a quiz to start studying.');
    expect(
      screen.queryByRole('link', { name: 'Session summary' }),
    ).not.toBeInTheDocument();
    expect((await dashboardApi.read()).performance.totals.completedAttempts).toBe(0);
    expect((await usageApi.read()).quota.requestsUsed).toBe(0);
    await expect(apiRequest('/attempts/' + practiceId)).rejects.toMatchObject({
      status: 404,
    });
    expect(
      queryClient
        .getQueryCache()
        .findAll()
        .some((q) => q.queryKey[0] === 'alice'),
    ).toBe(false);
  },
  30000,
);
