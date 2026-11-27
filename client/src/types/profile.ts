import { z } from 'zod';

export const profileInputSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Enter a display name.')
      .max(100)
      .refine(
        (value) =>
          !/[<>]/.test(value) &&
          [...value].every((character) => character.charCodeAt(0) >= 32),
        'Display name contains unsupported characters.',
      ),
  })
  .strict();
export const profileResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().nullable(),
    role: z.enum(['USERS', 'ADMIN', 'STAFF']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});
export type Profile = z.infer<typeof profileResponseSchema>['data'];
export type ProfileInput = z.infer<typeof profileInputSchema>;
