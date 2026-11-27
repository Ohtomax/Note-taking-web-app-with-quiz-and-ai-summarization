import { fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { apiClient } from '@/api/client';
import { resolveSession } from '@/features/auth/session.service';
export const httpWorkspaceEnabled = Boolean(process.env.STUDY_TEST_DATABASE_URL);
export function useHttpWorkspace() {
  let child: ChildProcess | undefined, originalBase: string | undefined;
  beforeAll(async () => {
    if (!httpWorkspaceEnabled) return;
    child = fork('tests/database/workspace-ui.fixture.ts', [], {
      cwd: resolve(process.cwd(), '../server'),
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    });
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Fixture startup timeout')), 15000);
      child!.once('message', (message) => {
        clearTimeout(timer);
        resolve(z.object({ port: z.number() }).parse(message).port);
      });
      child!.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Fixture exit ' + code));
      });
    });
    originalBase = apiClient.defaults.baseURL;
    apiClient.defaults.baseURL = 'http://127.0.0.1:' + port + '/api/v1';
  }, 20000);
  afterAll(async () => {
    if (!httpWorkspaceEnabled) return;
    resolveSession(null);
    if (originalBase === undefined) delete apiClient.defaults.baseURL;
    else apiClient.defaults.baseURL = originalBase;
    if (child && child.exitCode === null)
      await new Promise<void>((resolve) => {
        child!.once('exit', () => resolve());
        child!.send('stop');
      });
  });
}
