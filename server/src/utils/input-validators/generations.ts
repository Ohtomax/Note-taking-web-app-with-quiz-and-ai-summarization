import { z } from 'zod';
import { summarySettingsSchema } from './summaries.js';
import { sourceRequestSchema } from './ai-sources.js';
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);
export const generationParamsSchema = z
  .object({ generationId: z.string().uuid() })
  .strict();
export const summaryGenerationSchema = z
  .object({
    operation: z.literal('SUMMARY'),
    source: sourceRequestSchema,
    settings: summarySettingsSchema,
  })
  .strict();
export type SummaryGenerationInput = z.infer<typeof summaryGenerationSchema>;
export const storedGenerationSchema = z.object({
  projectId: z.string().uuid(),
  operation: z.enum(['SUMMARY', 'QUIZ']),
  settings: z.record(z.unknown()),
  output: z.unknown(),
  manifest: z.object({
    projectId: z.string().uuid(),
    projectRevision: z.number().int(),
    scope: z.enum(['NOTE', 'EXCERPT', 'NOTES', 'PROJECT']),
    sources: z
      .array(
        z.object({
          sourceKey: z.string(),
          noteId: z.string().uuid(),
          noteTitle: z.string(),
          revision: z.number().int(),
          text: z.string(),
          contentHash: z.string(),
          rangeStart: z.number().nullable(),
          rangeEnd: z.number().nullable(),
        }),
      )
      .min(1)
      .max(200),
  }),
});
