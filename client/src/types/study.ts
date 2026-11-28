import { z } from 'zod';
export const summarySettingsSchema = z
  .object({
    length: z.enum(['SHORT', 'MEDIUM', 'DETAILED']),
    format: z.enum([
      'QUICK',
      'PARAGRAPHS',
      'STUDY_GUIDE',
      'BULLETS',
      'KEY_CONCEPTS',
      'SIMPLIFIED',
      'EXAM_REVIEWER',
    ]),
  })
  .strict();
export type SummarySettings = z.infer<typeof summarySettingsSchema>;
export const summaryFormats: Record<SummarySettings['format'], string> = {
  QUICK: 'Quick summary',
  PARAGRAPHS: 'Detailed summary',
  STUDY_GUIDE: 'Study guide',
  BULLETS: 'Bullet points',
  KEY_CONCEPTS: 'Key concepts',
  SIMPLIFIED: 'Simplified explanation',
  EXAM_REVIEWER: 'Exam reviewer',
};
export const summaryLengths: Record<SummarySettings['length'], string> = {
  SHORT: 'Short',
  MEDIUM: 'Medium',
  DETAILED: 'Detailed',
};
export const summaryContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    sections: z
      .array(
        z
          .object({
            heading: z.string().max(200).nullable(),
            text: z.string().trim().min(1).max(16000),
            sourceKeys: z.array(z.string().max(100)).min(1).max(200),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict();
export type SummaryContent = z.infer<typeof summaryContentSchema>;
export const sourceMetadataSchema = z.object({
  sourceKey: z.string(),
  noteId: z.string().uuid().nullable(),
  noteTitle: z.string(),
  revision: z.number().int(),
  contentHash: z.string(),
  rangeStart: z.number().nullable(),
  rangeEnd: z.number().nullable(),
  stale: z.boolean().optional(),
});
export const generationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['RESERVED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'UNCERTAIN']),
  resultId: z.string().uuid().nullable(),
  errorCode: z.string().nullable(),
  result: z
    .object({
      projectId: z.string().uuid(),
      operation: z.enum(['SUMMARY', 'QUIZ']),
      settings: z.record(z.unknown()),
      output: z.unknown(),
      sources: z.array(sourceMetadataSchema),
    })
    .nullable(),
});
export type Generation = z.infer<typeof generationSchema>;
export const generationResponseSchema = z.object({ data: generationSchema });
export const summarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  content: summaryContentSchema,
  settings: summarySettingsSchema,
  generatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sources: z.array(sourceMetadataSchema),
  staleSources: z.boolean(),
});
export type SavedSummary = z.infer<typeof summarySchema>;
export const summaryResponseSchema = z.object({ data: summarySchema });
export const summaryPageSchema = z.object({
  data: z.array(summarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
