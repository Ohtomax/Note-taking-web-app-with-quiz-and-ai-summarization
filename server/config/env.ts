import { z } from 'zod';
import { geminiModelSchema } from '@/ai/config.js';

const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

const optionalValue = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const postgresUrl = optionalValue.refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}, 'Expected a PostgreSQL URL');

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://127.0.0.1:5173')
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .refine(
        (origins) =>
          origins.length > 0 &&
          origins.every((origin) => {
            try {
              return (
                ['http:', 'https:'].includes(new URL(origin).protocol) &&
                new URL(origin).origin === origin
              );
            } catch {
              return false;
            }
          }),
        'Expected explicit HTTP origins',
      ),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    DATABASE_URL: postgresUrl,
    DIRECT_URL: postgresUrl,
    DATABASE_CA_PATH: optionalValue,
    DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(5),
    REDIS_URL: optionalValue.refine((value) => {
      if (!value) return true;
      try {
        return ['redis:', 'rediss:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }),
    FIREBASE_SERVICE_ACCOUNT: optionalValue,
    AI_API_KEY: optionalValue,
    AI_GLOBAL_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(4),
    AI_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    AI_MODEL: geminiModelSchema,
  })
  .superRefine((config, context) => {
    if (config.AI_ENABLED && !config.AI_API_KEY)
      context.addIssue({
        code: 'custom',
        path: ['AI_API_KEY'],
        message: 'Required when AI is enabled',
      });
    if (config.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccountSchema.parse(JSON.parse(config.FIREBASE_SERVICE_ACCOUNT));
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['FIREBASE_SERVICE_ACCOUNT'],
          message: 'Invalid service account',
        });
      }
    }
    if (config.NODE_ENV === 'production') {
      for (const key of [
        'DATABASE_URL',
        'DATABASE_CA_PATH',
        'REDIS_URL',
        'FIREBASE_SERVICE_ACCOUNT',
      ] as const) {
        if (!config[key])
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'Required in production',
          });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;
export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export const parseEnvironment = (input: NodeJS.ProcessEnv): Environment => {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error('Invalid environment settings: ' + fields.join(', '));
  }
  return result.data;
};

export const parseServiceAccount = (value: string): ServiceAccount =>
  serviceAccountSchema.parse(JSON.parse(value));
