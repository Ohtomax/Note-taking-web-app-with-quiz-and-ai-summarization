import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type request from 'supertest';
import type { PrismaClient, QuestionType } from '../../src/generated/prisma/client.ts';
import { versionData } from '../../src/repositories/quizzes.repository.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
interface FixtureVersion {
  id: string;
  questions: Array<{
    id: string;
    type: QuestionType;
    options: Array<{ id: string; isCorrect: boolean }>;
  }>;
}
export async function seedAnalyticsFixture(
  db: PrismaClient,
  api: ReturnType<typeof request>,
  projectId: string,
  foreignProjectId: string,
) {
  const parent = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const secondProject = await db.project.create({
    data: { ownerId: parent.ownerId, title: 'Empty project' },
  });
  const note = await db.note.create({
    data: {
      projectId,
      title: 'Transport',
      plainText: 'TCP UDP',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'TCP UDP' }] }],
      },
    },
  });
  await db.note.create({
    data: {
      projectId,
      title: 'Archived note',
      plainText: 'Archived',
      archivedAt: new Date(),
    },
  });
  await db.summary.create({
    data: {
      projectId,
      title: 'Summary',
      content: {
        title: 'Summary',
        sections: [{ heading: null, text: 'Transport', sourceKeys: ['source'] }],
      },
      settings: { length: 'SHORT', format: 'PARAGRAPHS' },
      sources: {
        create: {
          sourceKey: 'source',
          noteId: note.id,
          noteTitle: note.title,
          revision: 1,
          contentHash: 'a'.repeat(64),
        },
      },
    },
  });
  const firstSettings = quizSettingsSchema.parse({
    title: 'Metric quiz',
    questionCount: 2,
    difficulty: 'EASY',
    questionTypes: ['MULTIPLE_CHOICE', 'IDENTIFICATION'],
    defaultMode: 'EXAM',
    includeExplanations: true,
  });
  const source = {
    sourceKey: 'source',
    noteId: note.id,
    noteTitle: note.title,
    revision: 1,
    contentHash: 'a'.repeat(64),
    rangeStart: null,
    rangeEnd: null,
  };
  const quiz = await db.quiz.create({
    data: {
      projectId,
      title: firstSettings.title,
      versions: {
        create: versionData(
          firstSettings,
          validQuiz(firstSettings, ['source']),
          [source],
          1,
        ),
      },
    },
    include: {
      versions: {
        include: {
          questions: { orderBy: { position: 'asc' }, include: { options: true } },
        },
      },
    },
  });
  const secondSettings = quizSettingsSchema.parse({
    ...firstSettings,
    questionCount: 4,
    difficulty: 'HARD',
    questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'IDENTIFICATION'],
  });
  const secondVersion = await db.quizVersion.create({
    data: {
      quizId: quiz.id,
      ...versionData(secondSettings, validQuiz(secondSettings, ['source']), [source], 2),
    },
    include: { questions: { orderBy: { position: 'asc' }, include: { options: true } } },
  });
  async function finish(
    quizId: string,
    version: FixtureVersion,
    token: string,
    correctness: Array<boolean | null>,
    hour: number,
    elapsedMs: number,
  ) {
    const started = await api
      .post('/api/v1/quizzes/' + quizId + '/attempts')
      .set('Authorization', 'Bearer ' + token)
      .set('Idempotency-Key', randomUUID())
      .send({ versionId: version.id, mode: 'EXAM' });
    assert.equal(started.status, 201);
    const id = started.body.data.id as string;
    for (const [index, correct] of correctness.entries()) {
      if (correct === null) continue;
      const q = version.questions[index]!;
      const answer =
        q.type === 'IDENTIFICATION'
          ? { text: correct ? 'TCP' : 'Unknown' }
          : {
              optionIds: correct
                ? q.options.filter((o) => o.isCorrect).map((o) => o.id)
                : q.type === 'MULTIPLE_SELECT'
                  ? [q.options.find((o) => o.isCorrect)!.id]
                  : [q.options.find((o) => !o.isCorrect)!.id],
            };
      assert.equal(
        (
          await api
            .put('/api/v1/attempts/' + id + '/answers/' + q.id)
            .set('Authorization', 'Bearer ' + token)
            .send({ expectedAnswerRevision: 0, ...answer })
        ).status,
        200,
      );
    }
    assert.equal(
      (
        await api
          .post('/api/v1/attempts/' + id + '/submit')
          .set('Authorization', 'Bearer ' + token)
          .send({})
      ).status,
      200,
    );
    const time = new Date(Date.UTC(2026, 10, 26, hour));
    await db.quizAttempt.update({
      where: { id },
      data: {
        startedAt: time,
        finishedAt: new Date(time.getTime() + elapsedMs),
        elapsedMs,
        completedDay: new Date('2026-11-26T00:00:00.000Z'),
      },
    });
    return id;
  }
  const firstAttemptId = await finish(
    quiz.id,
    quiz.versions[0]!,
    'alice',
    [true, true],
    10,
    1000,
  );
  const secondAttemptId = await finish(
    quiz.id,
    secondVersion,
    'alice',
    [true, false, false, null],
    11,
    2000,
  );
  const open = await api
    .post('/api/v1/quizzes/' + quiz.id + '/attempts')
    .set('Authorization', 'Bearer alice')
    .set('Idempotency-Key', randomUUID())
    .send({ versionId: secondVersion.id, mode: 'EXAM' });
  const abandoned = await api
    .post('/api/v1/quizzes/' + quiz.id + '/attempts')
    .set('Authorization', 'Bearer alice')
    .set('Idempotency-Key', randomUUID())
    .send({ versionId: secondVersion.id, mode: 'EXAM' });
  assert.equal(open.status, 201, JSON.stringify(open.body.error));
  assert.equal(abandoned.status, 201, JSON.stringify(abandoned.body.error));
  await api
    .post('/api/v1/attempts/' + abandoned.body.data.id + '/abandon')
    .set('Authorization', 'Bearer alice')
    .send({ confirmed: true });
  const foreignQuiz = await db.quiz.create({
    data: {
      projectId: foreignProjectId,
      title: 'Other learner',
      versions: {
        create: versionData(
          firstSettings,
          validQuiz(firstSettings, ['source']),
          [{ ...source, noteId: '' }],
          1,
        ),
      },
    },
    include: {
      versions: {
        include: {
          questions: { orderBy: { position: 'asc' }, include: { options: true } },
        },
      },
    },
  });
  await finish(foreignQuiz.id, foreignQuiz.versions[0]!, 'bob', [true, true], 12, 9000);
  return {
    quizId: quiz.id,
    firstVersionId: quiz.versions[0]!.id,
    secondVersionId: secondVersion.id,
    firstAttemptId,
    secondAttemptId,
    openAttemptId: open.body.data.id as string,
    secondProjectId: secondProject.id,
    noteId: note.id,
    from: '2026-11-01T00:00:00.000Z',
    to: '2026-12-01T00:00:00.000Z',
  };
}
