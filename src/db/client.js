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
    // If running under Node.js with a mocked window environment (e.g. test runner),
    // temporarily detach window so PGlite initializes Node.js filesystem wasm runtime
    const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
    const mockWindow = isNode && typeof globalThis.window !== 'undefined' ? globalThis.window : undefined;
    if (mockWindow) delete globalThis.window;

    try {
      const db = options.dataDir ? new PGlite(options.dataDir) : new PGlite();
      await db.waitReady;
      defaultDb = db;
    } finally {
      if (mockWindow) globalThis.window = mockWindow;
    }
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

