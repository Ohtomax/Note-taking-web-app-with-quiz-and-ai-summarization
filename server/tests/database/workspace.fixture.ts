import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { createApp } from '../../src/app.ts';
import { parseEnvironment } from '../../config/env.ts';
import { createUserRepository } from '../../src/repositories/user.repository.ts';
import { createUserService } from '../../src/services/user.service.ts';
import { createProjectsRepository } from '../../src/repositories/projects.repository.ts';
import { createProjectsService } from '../../src/services/projects.service.ts';
import { createApiLimiter } from '../../src/utils/rate-limiter/apiLimiter.ts';
import { createTestClient } from './setup.ts';
import { createNotesRepository } from '../../src/repositories/notes.repository.ts';
import { createNotesService } from '../../src/services/notes.service.ts';

export const withWorkspace = async (
  run: (fixture: Awaited<ReturnType<typeof createWorkspace>>) => Promise<void>,
) => {
  const fixture = await createWorkspace();
  try {
    await run(fixture);
  } finally {
    const { db, alice, bob } = fixture;
    const ownerFilter = { ownerId: { in: [alice.id, bob.id] } };
    const quizFilter = { project: ownerFilter };
    const versionFilter = { quiz: quizFilter };
    await db.quizAttemptAnswer.deleteMany({
      where: { attempt: { version: versionFilter } },
    });
    await db.quizAttempt.deleteMany({ where: { version: versionFilter } });
    await db.quizQuestionOption.deleteMany({
      where: { question: { version: versionFilter } },
    });
    await db.quizQuestion.deleteMany({ where: { version: versionFilter } });
    await db.quizSource.deleteMany({ where: { quizVersion: versionFilter } });
    await db.quizVersion.deleteMany({ where: versionFilter });
    await db.quiz.deleteMany({ where: quizFilter });
    await db.summarySource.deleteMany({ where: { summary: { project: ownerFilter } } });
    await db.summary.deleteMany({ where: { project: ownerFilter } });
    await db.note.deleteMany({ where: { project: ownerFilter } });
    await db.project.deleteMany({ where: ownerFilter });
    await db.user.deleteMany({ where: { id: { in: [alice.id, bob.id] } } });
    await db.$disconnect();
  }
};

const createWorkspace = async () => {
  const db = createTestClient();
  const alice = await db.user.create({ data: { firebaseUid: randomUUID() } });
  const bob = await db.user.create({ data: { firebaseUid: randomUUID() } });
  const project = await db.project.create({
    data: { ownerId: alice.id, title: 'Networking' },
  });
  const foreign = await db.project.create({
    data: { ownerId: bob.id, title: 'Networking' },
  });
  const app = createApp(undefined, parseEnvironment({}), () => {}, {
    userService: createUserService(createUserRepository(db)),
    projectsService: createProjectsService(createProjectsRepository(db)),
    notesService: createNotesService(createNotesRepository(db)),
    rateLimiter: createApiLimiter(new MemoryStore(), 500),
    verifyToken: async (token) => {
      if (token === 'alice') return { uid: alice.firebaseUid };
      if (token === 'bob') return { uid: bob.firebaseUid };
      throw new Error('Invalid test token');
    },
  });
  const api = request(app);
  return { db, alice, bob, project, foreign, api };
};
