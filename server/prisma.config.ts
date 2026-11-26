import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma',
  migrations: { path: './prisma/migrations' },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/study_unconfigured',
  },
});
