import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assertTestDatabase, withFixtureDirectory } from './setup.ts';

test('database guard rejects remote and ordinary databases', () => {
  assert.throws(() => assertTestDatabase('postgres://x@remote/study_test_' + 'a'.repeat(32)));
  assert.throws(() => assertTestDatabase('postgres://x@localhost/postgres'));
  assert.equal(
    assertTestDatabase('postgres://x@127.0.0.1/study_test_' + 'a'.repeat(32)).hostname,
    '127.0.0.1',
  );
});

test('fixtures clean up after both success and intentional failure', async () => {
  for (const fail of [false, true]) {
    let path = '';
    const run = withFixtureDirectory(async (directory) => {
      path = directory;
      await writeFile(join(directory, 'fixture.json'), '{}');
      if (fail) throw new Error('intentional fixture failure');
    });
    if (fail) await assert.rejects(run, /intentional/);
    else await run;
    await assert.rejects(access(path));
  }
});
