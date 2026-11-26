import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../src/generated/prisma/client.ts';

export const createAccountFixture = async (db: Prisma.TransactionClient) => {
  const user = await db.user.create({ data: { firebaseUid: randomUUID() } });
  const project = await db.project.create({
    data: { title: 'Private project', ownerId: user.id },
  });
  const note = await db.note.create({
    data: { title: 'Private note', projectId: project.id },
  });
  const summary = await db.summary.create({
    data: { title: 'Private summary', projectId: project.id },
  });
  const quiz = await db.quiz.create({
    data: { title: 'Private quiz', projectId: project.id },
  });
  const version = await db.quizVersion.create({
    data: {
      quizId: quiz.id,
      version: 1,
      difficulty: 'EASY',
      promptVersion: 'test',
      questions: {
        create: { position: 1, type: 'IDENTIFICATION', prompt: 'Private question' },
      },
    },
    include: { questions: true },
  });
  const attempt = await db.quizAttempt.create({
    data: {
      versionId: version.id,
      requestKey: randomUUID(),
      mode: 'EXAM',
      totalQuestions: 1,
    },
  });
  const usage = await db.aIUsage.create({
    data: {
      userId: user.id,
      requestKey: randomUUID(),
      inputHash: 'a'.repeat(64),
      operation: 'SUMMARY',
      provider: 'mock',
      model: 'mock',
    },
  });
  const question = version.questions[0]!;
  const option = await db.quizQuestionOption.create({
    data: {
      questionId: question.id,
      position: 1,
      text: 'Private option',
      isCorrect: true,
    },
  });
  const answer = await db.quizAttemptAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: question.id,
      versionId: version.id,
    },
  });
  const summarySource = await db.summarySource.create({
    data: {
      summaryId: summary.id,
      noteId: note.id,
      sourceKey: 'first',
      noteTitle: note.title,
      revision: 1,
      contentHash: 'a'.repeat(64),
    },
  });
  const quizSource = await db.quizSource.create({
    data: {
      quizVersionId: version.id,
      noteId: note.id,
      sourceKey: 'first',
      noteTitle: note.title,
      revision: 1,
      contentHash: 'a'.repeat(64),
    },
  });
  return {
    user,
    project,
    note,
    summary,
    quiz,
    question: version.questions[0]!,
    attempt,
    usage,
    version,
    option,
    answer,
    summarySource,
    quizSource,
  };
};
