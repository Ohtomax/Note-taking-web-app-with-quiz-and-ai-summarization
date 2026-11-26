import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

export const createPoolConfig = (
  connectionString: string,
  caPath: string,
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
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10_000,
  };
};
