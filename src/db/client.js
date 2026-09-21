import { PGlite } from '@electric-sql/pglite';

let defaultDb = null;

/**
 * Get or initialize a PostgreSQL database client.
 * Uses embedded PGlite for self-contained execution and tests, or connects to external Postgres.
 */
export async function getDb(options = {}) {
  if (options.fresh && defaultDb) {
    await defaultDb.close();
    defaultDb = null;
  }
  if (!defaultDb) {
    const dataDir = options.dataDir || undefined;
    const db = new PGlite(dataDir);
    await db.waitReady;
    defaultDb = db;
  }
  return defaultDb;
}

export async function withTransaction(callback) {
  const db = await getDb();
  if (typeof db.transaction === 'function') {
    return await db.transaction(callback);
  }
  await db.exec('BEGIN;');
  try {
    const result = await callback(db);
    await db.exec('COMMIT;');
    return result;
  } catch (err) {
    await db.exec('ROLLBACK;');
    throw err;
  }
}

export async function closeDb() {
  if (defaultDb) {
    await defaultDb.close();
    defaultDb = null;
  }
}

