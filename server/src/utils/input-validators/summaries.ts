import { z } from 'zod';
import { saveGenerationSchema } from './saved-artifacts.js';
export const summarySettingsSchema = z
  .object({
    length: z.enum(['SHORT', 'MEDIUM', 'DETAILED']),
    format: z.enum(['PARAGRAPHS', 'BULLETS', 'KEY_CONCEPTS', 'STUDY_GUIDE']),
  })
  .strict();
export type SummarySettings = z.infer<typeof summarySettingsSchema>;
export const summaryContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    sections: z
      .array(
        z
          .object({
            heading: z.string().trim().max(200).nullable(),
            text: z.string().trim().min(1).max(16000),
            sourceKeys: z.array(z.string().min(1).max(100)).min(1).max(200),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict();
export type SummaryContent = z.infer<typeof summaryContentSchema>;
export const saveSummarySchema = saveGenerationSchema
  .extend({ content: summaryContentSchema.optional() })
  .strict();
export type UpdateSummaryInput = z.infer<typeof updateSummarySchema>;
export const updateSummarySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: summaryContentSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);
