import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPoolConfig } from '../config/db.ts';
import { withFixtureDirectory } from './setup.ts';

test('pg options preserve explicit certificate verification over URL overrides', async () => {
  await withFixtureDirectory(async (directory) => {
    const path = join(directory, 'test-ca.crt');
    await writeFile(path, 'synthetic-ca');
    const config = createPoolConfig(
      'postgresql://test@localhost/test?sslmode=no-verify&sslrootcert=wrong',
      path,
    );
    assert.deepEqual(config.ssl, { ca: 'synthetic-ca', rejectUnauthorized: true });
    assert.equal(new URL(config.connectionString!).searchParams.has('sslmode'), false);
    assert.throws(() =>
      createPoolConfig('postgres://test@localhost/test', join(directory, 'absent')),
    );
  });
});
