import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (value) =>
          !/[<>]/.test(value) &&
          [...value].every((character) => character.charCodeAt(0) >= 32),
        'Display name contains unsupported characters',
      ),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
