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
]);
export type SourceRequest = z.infer<typeof sourceRequestSchema>;
