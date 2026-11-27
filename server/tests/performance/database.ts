import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.ts';
import { z } from 'zod';
import { assertTestDatabase } from '../setup.ts';
import { withWorkspace } from '../database/workspace.fixture.ts';
import { seedStudyQuiz } from '../database/study.fixture.ts';
import { createProjectsRepository } from '../../src/repositories/projects.repository.ts';
import { createNotesRepository } from '../../src/repositories/notes.repository.ts';
import { createQuizHistoryRepository } from '../../src/repositories/quiz-history.repository.ts';
import { createAnalyticsService } from '../../src/services/analytics.service.ts';
import { createAnalyticsRepository } from '../../src/repositories/analytics.repository.ts';
import { projectListSchema } from '../../src/utils/input-validators/projects.ts';
import { noteListSchema } from '../../src/utils/input-validators/notes.ts';
const url = process.env.STUDY_TEST_DATABASE_URL;
if (!url) throw Error('Set isolated test database');
assertTestDatabase(url);
const output = process.argv[2];
if (!output) throw Error('Pass a report output path');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url, ssl: false }),
  log: [{ emit: 'event', level: 'query' }],
});
const pool = new Pool({ connectionString: url, ssl: false });
let queries: Array<{ query: string; params: unknown[] }> = [];
db.$on('query', (event) =>
  queries.push({
    query: event.query,
    params: z.array(z.unknown()).parse(JSON.parse(event.params)),
  }),
);
const results: Array<{
  name: string;
  medianMs: number;
  p95Ms: number;
  maxQueries: number;
  budgetMs: number;
  plans: unknown[];
}> = [];
try {
  await withWorkspace(async ({ db: seed, alice, bob, project, foreign }) => {
    await seed.project.createMany({
      data: Array.from({ length: 118 }, (_, i) => ({
        ownerId: i < 59 ? alice.id : bob.id,
        title: 'Benchmark project ' + i,
      })),
    });
    const parents = await seed.project.findMany({
      where: { ownerId: { in: [alice.id, bob.id] } },
      select: { id: true },
    });
    await seed.note.createMany({
      data: parents.flatMap((p) =>
        Array.from({ length: 50 }, (_, i) => ({
          projectId: p.id,
          title: 'Note ' + i,
          plainText: i % 10 === 0 ? 'TCP transport match' : 'Other synthetic material',
        })),
      ),
    });
    for (const parent of [project, foreign]) {
      const { version } = await seedStudyQuiz(seed, parent.id);
      for (let batch = 0; batch < 6; batch++) {
        const finishedAt = new Date(),
          completedDay = new Date(finishedAt.toISOString().slice(0, 10) + 'T00:00:00Z');
        await seed.quizAttempt.createMany({
          data: Array.from({ length: 1000 }, () => ({
            versionId: version.id,
            requestKey: randomUUID(),
            mode: 'EXAM' as const,
            status: 'COMPLETED' as const,
            totalQuestions: 4,
            correctCount: 3,
            answeredCount: 4,
            scoreRatio: 0.75,
            elapsedMs: 1000,
            startedAt: new Date(finishedAt.getTime() - 1000),
            finishedAt,
            completedDay,
          })),
        });
      }
    }
    // Static maintenance statements apply only after the guarded synthetic seed.
    for (const table of ['Project', 'Note', 'QuizAttempt'])
      await pool.query('ANALYZE "' + table + '"');
    const operations = [
      {
        name: 'project list',
        budget: 250,
        run: async () => {
          const page = await createProjectsRepository(db).list(
            alice.id,
            projectListSchema.parse({}),
          );
          assert.equal(page.total, 60);
          assert.equal(page.data.length, 20);
        },
      },
      {
        name: 'note search',
        budget: 250,
        run: async () => {
          const page = await createNotesRepository(db).list(
            alice.id,
            project.id,
            noteListSchema.parse({ search: 'TCP' }),
          );
          assert.equal(page.total, 5);
          assert.equal(page.data.length, 5);
        },
      },
      {
        name: 'history page',
        budget: 250,
        run: async () => {
          const page = await createQuizHistoryRepository(db).list(alice.id, {
            page: 1,
            pageSize: 20,
          });
          assert.equal(page.total, 6000);
          assert.equal(page.data.length, 20);
        },
      },
      {
        name: 'global analytics',
        budget: 750,
        run: async () => {
          const report = await createAnalyticsService(
            createAnalyticsRepository(db),
          ).global(alice.id, {});
          assert.equal(report.totals.completedAttempts, 6000);
          assert.equal(report.totals.questionsAssigned, 24000);
          assert.equal(report.totals.meanScore, 75);
        },
      },
    ];
    for (const operation of operations) {
      const timings: number[] = [],
        counts: number[] = [];
      for (let iteration = 0; iteration < 14; iteration++) {
        queries = [];
        const start = performance.now();
        await operation.run();
        const elapsed = performance.now() - start;
        if (iteration >= 2) {
          timings.push(elapsed);
          counts.push(queries.length);
        }
      }
      const unique = [
        ...new Map(
          queries.filter((q) => /^SELECT\b/.test(q.query)).map((q) => [q.query, q]),
        ).values(),
      ];
      const plans = [];
      for (const query of unique) {
        // Only Prisma-emitted SELECT text is prefixed; original values stay bound parameters.
        const result = await pool.query(
          'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query.query,
          query.params,
        );
        plans.push(result.rows[0] as unknown);
      }
      timings.sort((a, b) => a - b);
      results.push({
        name: operation.name,
        medianMs: Number(timings[Math.floor(timings.length / 2)]!.toFixed(2)),
        p95Ms: Number(timings[Math.ceil(timings.length * 0.95) - 1]!.toFixed(2)),
        maxQueries: Math.max(...counts),
        budgetMs: operation.budget,
        plans,
      });
    }
  }, undefined);
  await writeFile(
    output,
    JSON.stringify(
      {
        fixture: {
          projects: 120,
          notes: 6000,
          attempts: 12000,
          owners: 2,
          samples: 12,
          warmups: 2,
        },
        results,
      },
      null,
      2,
    ),
  );
  for (const result of results) {
    process.stdout.write(JSON.stringify({ ...result, plans: undefined }) + '\n');
    assert.ok(
      result.p95Ms < result.budgetMs,
      result.name + ' exceeded local regression budget',
    );
  }
} finally {
  await db.$disconnect();
  await pool.end();
}
