import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function assertTestDatabase(url: string): URL {
  const parsed = new URL(url);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
    !/^\/study_test_[a-f0-9]{32}$/.test(parsed.pathname)
  ) {
    throw new Error('Tests require an isolated loopback study_test_<uuid> database');
  }
  return parsed;
}

export async function withFixtureDirectory<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'study-fixture-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
