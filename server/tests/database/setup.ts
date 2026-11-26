import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../../src/generated/prisma/client.ts';
import { assertTestDatabase } from '../setup.ts';

const url = process.env.STUDY_TEST_DATABASE_URL;
if (!url)
  throw new Error('Set STUDY_TEST_DATABASE_URL for an isolated local test database');
assertTestDatabase(url);

export const createTestClient = () =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url, ssl: false }) });

export const withDatabaseFixture = async (
  run: (db: Prisma.TransactionClient) => Promise<void>,
) => {
  const db = createTestClient();
  const rollback = new Error('fixture rollback');
  try {
    await db.$transaction(async (transaction) => {
      await run(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await db.$disconnect();
  }
};
