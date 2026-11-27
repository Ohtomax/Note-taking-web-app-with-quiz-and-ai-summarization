import { z } from 'zod';

const metadata = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  color: z.enum(['slate', 'blue', 'green', 'purple', 'rose', 'amber']),
  icon: z.enum(['folder', 'book', 'code', 'science', 'language']),
};

export const createProjectSchema = z
  .object({
    title: metadata.title,
    description: metadata.description.default(''),
    color: metadata.color.default('slate'),
    icon: metadata.icon.default('folder'),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
