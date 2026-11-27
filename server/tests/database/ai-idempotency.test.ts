import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withWorkspace } from './workspace.fixture.ts';
import { createMockAIClient } from '../../src/ai/client.ts';
import { createAISourcesRepository } from '../../src/repositories/ai-sources.repository.ts';
import { createAISourcesService } from '../../src/services/ai-sources.service.ts';
import { createAIUsageRepository } from '../../src/repositories/ai-usage.repository.ts';
import { createAIUsageService } from '../../src/services/ai-usage.service.ts';
import { createAIAdmissionRepository } from '../../src/repositories/ai-admission.repository.ts';
import { createAIGenerationRepository } from '../../src/repositories/ai-generation.repository.ts';
import { createAIGenerationService } from '../../src/services/ai-generation.service.ts';
test('P4-T10 concurrent and dropped-response retries share one logical generation and charge', async () => {
  await withWorkspace(async ({ db, alice, bob, project }) => {
    const note = await db.note.create({
      data: {
        projectId: project.id,
        title: 'Network',
        plainText: 'TCP controls transport',
      },
    });
    const client = createMockAIClient(() => ({ text: 'TCP' }));
    const service = createAIGenerationService({
      client,
      sources: createAISourcesService(createAISourcesRepository(db)),
      repository: createAIGenerationRepository(db),
      admission: createAIAdmissionRepository(db),
      usage: createAIUsageService(createAIUsageRepository(db)),
    });
    const key = randomUUID(),
      source = { scope: 'NOTE' as const, noteId: note.id, revision: 1 },
      schema = z.object({ text: z.string() });
    try {
      const [first, duplicate] = await Promise.all([
        service.execute(alice.id, project.id, key, 'SUMMARY', source, {}, schema),
        service.execute(alice.id, project.id, key, 'SUMMARY', source, {}, schema),
      ]);
      assert.equal(first.id, duplicate.id);
      assert.equal(client.calls.length, 1);
      const retry = await service.execute(
        alice.id,
        project.id,
        key,
        'SUMMARY',
        source,
        {},
        schema,
      );
      assert.equal(retry.status, 'SUCCEEDED');
      assert.equal(client.calls.length, 1);
      assert.equal(await db.aICall.count({ where: { usageId: retry.id } }), 1);
      await assert.rejects(
        service.execute(
          alice.id,
          project.id,
          key,
          'SUMMARY',
          source,
          { changed: true },
          schema,
        ),
        /new key/,
      );
      await assert.rejects(service.get(bob.id, retry.id), /Resource not found/);
      await service.execute(
        alice.id,
        project.id,
        randomUUID(),
        'SUMMARY',
        source,
        {},
        schema,
      );
      assert.equal(client.calls.length, 2);
    } finally {
      await db.aIUsage.deleteMany({ where: { userId: alice.id } });
    }
  });
});
