import { once } from 'node:events';
import { z } from 'zod';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { quizSettingsSchema } from '../../src/utils/input-validators/quizzes.ts';
import { validQuiz } from '../fixtures/ai.ts';
const settings = quizSettingsSchema.parse({
  title: 'Session protocols',
  questionCount: 10,
  difficulty: 'EASY',
  questionTypes: ['MULTIPLE_CHOICE'],
  defaultMode: 'PRACTICE',
  includeExplanations: true,
});
const client = createMockAIClient((request) => {
  const data = z
    .object({
      operation: z.enum(['SUMMARY', 'QUIZ']),
      allowedSourceKeys: z.array(z.string()),
    })
    .parse(JSON.parse(request.prompt));
  return data.operation === 'QUIZ'
    ? validQuiz(settings, data.allowedSourceKeys)
    : {
        title: 'Session summary',
        sections: [
          {
            heading: null,
            text: 'TCP is reliable transport.',
            sourceKeys: data.allowedSourceKeys,
          },
        ],
      };
});
try {
  await withWorkspace(async ({ app, db, project, alice }) => {
    await db.note.create({
      data: {
        projectId: project.id,
        title: 'Session notes',
        plainText: 'TCP is reliable transport.',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'TCP is reliable transport.' }],
            },
          ],
        },
      },
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing port');
    process.send?.({ port: address.port, projectId: project.id });
    try {
      await new Promise<void>((resolve) => {
        process.on('message', (message) => {
          if (message === 'stop') resolve();
          if (message === 'stats')
            void Promise.all([
              db.quizAttempt.count({
                where: { version: { quiz: { project: { ownerId: alice.id } } } },
              }),
              db.aIUsage.count({ where: { userId: alice.id } }),
            ]).then(([attempts, requests]) =>
              process.send?.({ calls: client.calls.length, attempts, requests }),
            );
        });
        process.once('disconnect', resolve);
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
  }, client);
  process.disconnect?.();
} catch {
  process.stderr.write('Isolated study fixture failed.\n');
  process.exitCode = 1;
  process.disconnect?.();
}
