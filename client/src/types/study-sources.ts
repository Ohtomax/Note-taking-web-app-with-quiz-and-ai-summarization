import { z } from 'zod';
const note = { noteId: z.string().uuid(), revision: z.number().int().positive() };
export const sourceRequestSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('NOTE'), ...note }).strict(),
  z
    .object({
      scope: z.literal('EXCERPT'),
      ...note,
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      scope: z.literal('NOTES'),
      noteIds: z.array(z.string().uuid()).min(1).max(200),
    })
    .strict(),
  z.object({ scope: z.literal('PROJECT') }).strict(),
  z
    .object({
      scope: z.literal('SUMMARY'),
      summaryId: z.string().uuid(),
      updatedAt: z.string().datetime(),
    })
    .strict(),
]);
export type SourceRequest = z.infer<typeof sourceRequestSchema>;
export interface SourceChoice {
  projectId: string;
  source: SourceRequest;
  description: string;
}
