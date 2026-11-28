import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = URL.parse(process.env.DIRECT_URL || process.env.DATABASE_URL || '');
if (!url?.hostname || !['postgres:', 'postgresql:'].includes(url.protocol)) {
  process.stderr.write(
    'Set a valid PostgreSQL DIRECT_URL or DATABASE_URL before migrating.\n',
  );
  process.exit(1);
}

if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  url.searchParams.set('sslmode', 'verify-full');
  if (process.env.DATABASE_CA_PATH) {
    url.searchParams.set('sslrootcert', resolve(process.env.DATABASE_CA_PATH));
  }
}

const env = { ...process.env, DIRECT_URL: url.href };
const run = (action) =>
  spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', action], {
    env,
    stdio: 'inherit',
  }).status ?? 1;

const deployed = run('deploy');
process.exitCode = deployed === 0 ? run('status') : deployed;
