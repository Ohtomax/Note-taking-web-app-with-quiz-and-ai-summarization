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

export const projectListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(200).default(''),
    archived: z.enum(['true', 'false']).default('false'),
    sort: z.enum(['title', 'createdAt', 'updatedAt']).default('updatedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type ProjectListInput = z.infer<typeof projectListSchema>;
