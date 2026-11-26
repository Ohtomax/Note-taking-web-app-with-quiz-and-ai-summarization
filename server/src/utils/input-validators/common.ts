import { z } from 'zod';

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const resourceParamsSchema = z.object({ id: z.string().uuid() }).strict();
