import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// No account credentials are used. Every Docker resource has a unique fixture name.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(join(tmpdir(), 'quillquiz-docker-'));
const id = randomUUID().replaceAll('-', '');
const prefix = 'quillquiz-test-' + id;
const image = 'quillquiz-api:render-free';
const containers = [];
const volumes = [];
const markers = [
  join(root, 'server', 'context-probe-' + id + '.txt'),
  join(root, 'server', 'config', 'context-probe-' + id + '.crt'),
];
const marker = 'DOCKER_CONTEXT_SECRET_' + id;
const docker = (args) =>
  execFileSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 600_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const start = (name, args) => {
  containers.push(name);
  docker(['run', '-d', '--name', name, '--network', prefix, ...args]);
};
const stats = (name) => {
  try {
    return JSON.parse(docker(['stats', '--no-stream', '--format', '{{json .}}', name]));
  } catch (error) {
    // This command only samples resource metrics, with no environment or credentials.
    console.error('Docker stats:', String(error.stderr ?? error.message));
    throw error;
  }
};
let networkCreated = false;
let step = 'checking Docker';
try {
  docker(['version']);
  for (const path of markers) writeFileSync(path, marker);
  console.log('Building Linux runtime and explicit migration images...');
  step = 'building images';
  docker(['build', '--target', 'runtime', '-t', image, './server']);
  docker(['build', '--target', 'migration', '-t', image + '-migration', './server']);
  for (const path of markers) unlinkSync(path);
  const inspect = JSON.parse(docker(['image', 'inspect', image]))[0];
  assert.equal(inspect.Config.User, 'node:node');
  assert.ok(!docker(['history', '--no-trunc', image]).includes(marker));
  docker(['network', 'create', prefix]);
  networkCreated = true;
  for (const suffix of ['tls', 'data']) {
    const name = prefix + '-' + suffix;
    docker(['volume', 'create', name]);
    volumes.push(name);
  }
  step = 'creating disposable TLS certificates';
  docker([
    'run',
    '--rm',
    '--user',
    '0:0',
    '--mount',
    'type=volume,src=' + prefix + '-tls,dst=/tls',
    '--entrypoint',
    'sh',
    image,
    '-ec',
    'cd /tls; ' +
      'openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=Disposable-Study-CA -keyout ca.key -out ca.crt; ' +
      'openssl req -newkey rsa:2048 -nodes -subj /CN=db -keyout server.key -out server.csr; ' +
      'echo subjectAltName=DNS:db > extensions; ' +
      'openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -extfile extensions -out server.crt; ' +
      'chown 999:999 server.key; chmod 600 server.key; chmod 644 ca.crt server.crt',
  ]);
  const database = 'study_test_' + id;
  const url =
    'postgresql://study_fixture:' +
    randomBytes(24).toString('hex') +
    '@db:5432/' +
    database;
  const pgEnv = join(directory, 'postgres.env');
  writeFileSync(
    pgEnv,
    [
      'POSTGRES_USER=study_fixture',
      'POSTGRES_PASSWORD=' + new URL(url).password,
      'POSTGRES_DB=' + database,
    ].join('\n'),
  );
  step = 'starting disposable PostgreSQL and Redis';
  const pg = prefix + '-db';
  start(pg, [
    '--network-alias',
    'db',
    '--env-file',
    pgEnv,
    '--mount',
    'type=volume,src=' + prefix + '-data,dst=/var/lib/postgresql',
    '--mount',
    'type=volume,src=' + prefix + '-tls,dst=/tls,readonly',
    'postgres:18-bookworm',
    '-c',
    'ssl=on',
    '-c',
    'ssl_cert_file=/tls/server.crt',
    '-c',
    'ssl_key_file=/tls/server.key',
  ]);
  let databaseReady = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      docker(['exec', pg, 'pg_isready', '-U', 'study_fixture', '-d', database]);
      databaseReady = true;
      break;
    } catch {
      await pause(1000);
    }
  }
  assert.ok(databaseReady, 'Disposable PostgreSQL did not become ready');
  start(prefix + '-redis', [
    '--network-alias',
    'redis',
    'redis:8-bookworm',
    'redis-server',
    '--save',
    '',
    '--appendonly',
    'no',
  ]);
  const migrationEnv = join(directory, 'migration.env');
  writeFileSync(
    migrationEnv,
    'DATABASE_URL=' + url + '?sslmode=verify-full&sslrootcert=/tls/ca.crt\n',
  );
  step = 'applying migrations to the disposable database';
  docker([
    'run',
    '--rm',
    '--network',
    prefix,
    '--env-file',
    migrationEnv,
    '--mount',
    'type=volume,src=' + prefix + '-tls,dst=/tls,readonly',
    image + '-migration',
  ]);
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const runtimeEnv = join(directory, 'runtime.env');
  writeFileSync(
    runtimeEnv,
    [
      'DATABASE_URL=' + url,
      'DATABASE_CA_PATH=/tls/ca.crt',
      'REDIS_URL=redis://redis:6379',
      'CORS_ORIGINS=https://quillquiz.example',
      'FIREBASE_SERVICE_ACCOUNT=' +
        JSON.stringify({
          project_id: 'disposable-study-test',
          client_email: 'fixture@disposable-study-test.iam.gserviceaccount.com',
          private_key: privateKey,
        }),
    ].join('\n'),
  );
  step = 'starting the API with 0.1 CPU and 512 MiB';
  const api = prefix + '-api';
  start(api, [
    '--memory',
    '512m',
    '--cpus',
    '0.1',
    '--pids-limit',
    '128',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,size=16m',
    '--publish',
    '127.0.0.1::10000',
    '--env-file',
    runtimeEnv,
    '--mount',
    'type=volume,src=' + prefix + '-tls,dst=/tls,readonly',
    image,
  ]);
  const ports = JSON.parse(
    docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', api]),
  );
  const origin = 'http://127.0.0.1:' + ports['10000/tcp'][0].HostPort;
  const started = Date.now();
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if (
        (await fetch(origin + '/api/health/ready', { signal: AbortSignal.timeout(4000) }))
          .ok
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the capped process to start. */
    }
    await pause(1000);
  }
  assert.ok(ready, 'API readiness failed');
  const startupMs = Date.now() - started;
  step = 'checking authentication, CORS, image contents, and TLS rejection';
  assert.equal((await fetch(origin + '/api/v1/me')).status, 401);
  for (const [browserOrigin, expected] of [
    ['https://quillquiz.example', 'https://quillquiz.example'],
    ['https://unlisted.example', null],
  ]) {
    const response = await fetch(origin + '/api/health/live', {
      headers: { Origin: browserOrigin },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), expected);
  }
  docker([
    'exec',
    api,
    'node',
    '--input-type=module',
    '-e',
    `
    import assert from 'node:assert/strict';
    import { existsSync, readFileSync, readdirSync } from 'node:fs';
    import { createDatabase } from './dist/config/db.js';
    assert.equal(process.getuid(), 1000);
    for (const path of ['/app/.env', '/app/certs', '/app/config', '/app/src', '/app/node_modules/typescript', '/app/node_modules/prisma', '/app/context-probe-${id}.txt']) {
      assert.equal(existsSync(path), false, path);
    }
    function checkFiles(path) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const file = path + '/' + entry.name;
        if (entry.isDirectory()) checkFiles(file);
        else assert.ok(!readFileSync(file, 'utf8').includes('${marker}'));
      }
    }
    checkFiles('/app/dist');
    const db = createDatabase(process.env.DATABASE_URL, process.env.DATABASE_CA_PATH, 2);
    await db.user.findFirst({ select: { id: true } });
    await db.$disconnect();
    const wrongCA = createDatabase(process.env.DATABASE_URL, '/etc/ssl/certs/ca-certificates.crt', 2);
    await assert.rejects(() => wrongCA.user.findFirst({ select: { id: true } }));
    await wrongCA.$disconnect();
  `,
  ]);
  step = 'sampling resource use during readiness requests';
  const samples = [stats(api)];
  const latencies = [];
  for (let batch = 0; batch < 5; batch++) {
    // Docker CLI inspections block this host event loop. Process closed HTTP
    // keep-alive sockets before reusing fetch connections after those calls.
    await pause(100);
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        const begin = Date.now();
        const response = await fetch(origin + '/api/health/ready', {
          signal: AbortSignal.timeout(10_000),
        });
        assert.equal(response.status, 200);
        await response.arrayBuffer();
        latencies.push(Date.now() - begin);
      }),
    );
    samples.push(stats(api));
    console.log(
      'Readiness batch',
      batch + 1,
      'completed; memory',
      samples.at(-1).MemUsage,
    );
  }
  latencies.sort((a, b) => a - b);
  step = 'inspecting final API state';
  const state = JSON.parse(docker(['inspect', '--format', '{{json .State}}', api]));
  assert.equal(state.OOMKilled, false);
  assert.equal(state.Running, true);
  console.log(
    JSON.stringify(
      {
        image,
        imageBytes: inspect.Size,
        user: inspect.Config.User,
        memoryLimit: '512 MiB',
        cpuLimit: 0.1,
        startupMs,
        readinessRequests: latencies.length,
        p95Ms: latencies[Math.ceil(latencies.length * 0.95) - 1],
        memorySamples: samples.map((sample) => sample.MemUsage),
        tls: 'Authenticated database read passed; unrelated CA rejected',
        privateAPI: 'Missing token rejected with 401; no live Firebase login tested',
        cors: 'Allowed origin accepted; unlisted origin omitted',
        artifacts: directory,
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Child output and Docker inspect env can contain credentials. Never dump them.
  console.error(
    'Docker acceptance failed while ' + step + ':',
    error instanceof assert.AssertionError
      ? error.message
      : 'Failure type: ' +
          error.name +
          '; code: ' +
          (error.code ?? error.cause?.code ?? 'none'),
  );
  console.error('Synthetic fixture files retained at', directory);
  process.exitCode = 1;
} finally {
  for (const name of containers.reverse()) {
    try {
      docker(['rm', '-f', name]);
    } catch {
      /* Only this run's containers. */
    }
  }
  for (const name of volumes) {
    try {
      docker(['volume', 'rm', name]);
    } catch {
      /* Only this run's volumes. */
    }
  }
  if (networkCreated) {
    try {
      docker(['network', 'rm', prefix]);
    } catch {
      /* Preserve the original failure. */
    }
  }
  for (const path of markers) {
    try {
      unlinkSync(path);
    } catch {
      /* Only this run's marker files. */
    }
  }
}
