import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client.js';

export const createDatabase = (connectionString: string, caPath: string, max = 5) =>
  new PrismaClient({
    adapter: new PrismaPg(createPoolConfig(connectionString, caPath, max)),
  });

export const createPoolConfig = (
  connectionString: string,
  caPath: string,
  max = 5,
): PoolConfig => {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Invalid database protocol');
  }
  // pg URL SSL options can replace the explicit verified TLS object.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword']) {
    url.searchParams.delete(key);
  }
  return {
    connectionString: url.toString(),
    ssl: { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true },
    max,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10_000,
  };
};
