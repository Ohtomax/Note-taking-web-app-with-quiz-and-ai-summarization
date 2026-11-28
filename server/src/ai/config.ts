import { z } from 'zod';

export const geminiModelSchema = z
  .string()
  .max(100)
  .regex(/^gemini-[a-z0-9][a-z0-9.-]*$/)
  .default('gemini-3.5-flash-lite');

const aiConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    apiKey: z.string().trim().min(1).optional(),
    model: geminiModelSchema,
  })
  .refine((value) => !value.enabled || Boolean(value.apiKey));

export function parseAIConfig(input: unknown) {
  const result = aiConfigSchema.safeParse(input);
  if (!result.success) throw new Error('Invalid AI configuration');
  return result.data;
}
