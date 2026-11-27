import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.ts';
import { assertTestDatabase } from '../setup.ts';
import { withWorkspace } from '../database/workspace.fixture.ts';
import { seedAnalyticsFixture } from '../database/analytics.fixture.ts';
import { createApp } from '../../src/app.ts';
import { parseEnvironment } from '../../config/env.ts';
import { createStudyServices } from '../../config/ai.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { createApiLimiter } from '../../src/utils/rate-limiter/apiLimiter.ts';
import { createUserRepository } from '../../src/repositories/user.repository.ts';
import { createUserService } from '../../src/services/user.service.ts';
import { createProjectsRepository } from '../../src/repositories/projects.repository.ts';
import { createProjectsService } from '../../src/services/projects.service.ts';
import { createNotesRepository } from '../../src/repositories/notes.repository.ts';
import { createNotesService } from '../../src/services/notes.service.ts';
const sourceUrl = assertTestDatabase(process.env.STUDY_TEST_DATABASE_URL ?? '');
if (sourceUrl.username !== 'study_fixture' || sourceUrl.password)
  throw Error('Recovery fixture requires the synthetic study_fixture identity');
const pgBin = process.argv[2],
  directory = process.argv[3];
if (!pgBin || !directory)
  throw Error('Pass PostgreSQL bin and a temporary artifact directory');
const output = resolve(directory);
await mkdir(output, { recursive: true });
const targetName = 'study_test_' + randomUUID().replaceAll('-', ''),
  targetUrl = new URL(sourceUrl);
targetUrl.pathname = '/' + targetName;
assertTestDatabase(targetUrl.toString());
const cli = (name: string, args: string[]) =>
  execFileSync(
    join(pgBin, name + '.exe'),
    ['-h', sourceUrl.hostname, '-p', sourceUrl.port, '-U', sourceUrl.username, ...args],
    { stdio: 'pipe', env: { ...process.env, PGPASSWORD: '' } },
  );
const snapshot = async (db: PrismaClient) => ({
  users: await db.user.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, firebaseUid: true, role: true },
  }),
  projects: await db.project.findMany({ orderBy: { id: 'asc' } }),
  notes: await db.note.findMany({ orderBy: { id: 'asc' } }),
  summaries: await db.summary.findMany({
    orderBy: { id: 'asc' },
    include: { sources: { orderBy: { id: 'asc' } } },
  }),
  quizzes: await db.quiz.findMany({
    orderBy: { id: 'asc' },
    include: {
      versions: {
        orderBy: { id: 'asc' },
        include: {
          sources: { orderBy: { id: 'asc' } },
          questions: {
            orderBy: { id: 'asc' },
            include: { options: { orderBy: { id: 'asc' } } },
          },
          attempts: {
            orderBy: { id: 'asc' },
            include: {
              answers: { orderBy: { id: 'asc' } },
              typeMetrics: { orderBy: { type: 'asc' } },
            },
          },
        },
      },
    },
  }),
});
let restored: PrismaClient | undefined,
  created = false;
try {
  await withWorkspace(async ({ db, api, project, foreign, alice, bob }) => {
    const fixture = await seedAnalyticsFixture(db, api, project.id, foreign.id),
      before = await snapshot(db),
      backup = join(output, 'synthetic-study.dump');
    const dumpStart = performance.now();
    cli('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--file',
      backup,
      sourceUrl.pathname.slice(1),
    ]);
    const dumpMs = Math.round(performance.now() - dumpStart);
    cli('createdb', [targetName]);
    created = true;
    const restoreStart = performance.now();
    cli('pg_restore', [
      '--exit-on-error',
      '--no-owner',
      '--no-acl',
      '-d',
      targetName,
      backup,
    ]);
    const restoreMs = Math.round(performance.now() - restoreStart);
    restored = new PrismaClient({
      adapter: new PrismaPg({ connectionString: targetUrl.toString(), ssl: false }),
    });
    assert.deepEqual(
      await snapshot(restored),
      before,
      'Restored rows/relations/snapshots changed',
    );
    const mock = createMockAIClient(() => {
      throw Error('Restored history must not generate');
    });
    const app = createApp(
      async () => true,
      parseEnvironment({}),
      () => {},
      {
        ...createStudyServices(restored, mock),
        userService: createUserService(createUserRepository(restored)),
        projectsService: createProjectsService(createProjectsRepository(restored)),
        notesService: createNotesService(createNotesRepository(restored)),
        rateLimiter: createApiLimiter(new MemoryStore(), 500),
        verifyToken: async (token) => {
          if (token === 'alice') return { uid: alice.firebaseUid };
          if (token === 'bob') return { uid: bob.firebaseUid };
          throw Error('Invalid fixture token');
        },
      },
    );
    const recovered = request(app);
    for (const [token, own, other] of [
      ['alice', project, foreign],
      ['bob', foreign, project],
    ] as const) {
      assert.equal(
        (
          await recovered
            .get('/api/v1/projects/' + own.id)
            .auth(token, { type: 'bearer' })
        ).status,
        200,
      );
      assert.equal(
        (
          await recovered
            .get('/api/v1/projects/' + other.id)
            .auth(token, { type: 'bearer' })
        ).status,
        404,
      );
    }
    const known = await recovered
      .get('/api/v1/attempts/' + fixture.firstAttemptId + '/results')
      .auth('alice', { type: 'bearer' });
    assert.equal(known.status, 200);
    assert.equal(known.body.data.result.percentage, 100);
    const report = await recovered
      .get('/api/v1/analytics?from=' + fixture.from + '&to=' + fixture.to)
      .auth('alice', { type: 'bearer' });
    assert.equal(report.body.data.totals.meanScore, 62.5);
    assert.equal(report.body.data.totals.accuracy, 60);
    const original = await api
      .get('/api/v1/attempts/' + fixture.firstAttemptId + '/results')
      .auth('alice', { type: 'bearer' });
    assert.deepEqual(known.body.data, original.body.data);
    assert.equal(mock.calls.length, 0);
    const sha256 = createHash('sha256')
      .update(await readFile(backup))
      .digest('hex');
    const evidence = {
      date: '2026-11-28',
      scope:
        'Disposable local PostgreSQL backup/restore with injected mapped test identities',
      dumpMs,
      restoreMs,
      sha256,
      counts: {
        users: before.users.length,
        projects: before.projects.length,
        notes: before.notes.length,
        summaries: before.summaries.length,
        quizzes: before.quizzes.length,
        versions: before.quizzes.reduce((sum, q) => sum + q.versions.length, 0),
        attempts: before.quizzes.reduce(
          (sum, q) => sum + q.versions.reduce((n, v) => n + v.attempts.length, 0),
          0,
        ),
      },
      checks: [
        'all rows and source/question/answer/type snapshots equal',
        'both restored UID ownership chains enforced',
        'known historical score 100%',
        'global mean 62.5% and accuracy 60%',
        'zero AI calls',
      ],
      liveFirebaseRecovery: false,
    };
    await writeFile(
      join(output, 'restore-evidence.json'),
      JSON.stringify(evidence, null, 2),
    );
    process.stdout.write(JSON.stringify(evidence) + '\n');
  });
} finally {
  await restored?.$disconnect();
  if (created) cli('dropdb', [targetName]);
}
