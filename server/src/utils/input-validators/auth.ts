import { z } from 'zod';

export const authorizationSchema = z
  .string()
  .max(8192)
  .regex(/^Bearer [^\s]+$/i);
export const verifiedIdentitySchema = z.object({
  uid: z.string().min(1).max(128),
  email: z.string().email().optional(),
  name: z.string().max(1000).optional(),
});
