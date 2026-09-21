import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_DIR = path.resolve(__dirname, '../../prisma/migrations/0001_initial_schema');

export async function runMigrationUp(db) {
  const targetDb = db || (await getDb());
  const upSqlPath = path.join(MIGRATION_DIR, 'migration.sql');
  const upSql = fs.readFileSync(upSqlPath, 'utf-8');

  await targetDb.exec(upSql);
  return { success: true, direction: 'UP' };
}

export async function runMigrationDown(db) {
  const targetDb = db || (await getDb());
  const downSqlPath = path.join(MIGRATION_DIR, 'down.sql');
  const downSql = fs.readFileSync(downSqlPath, 'utf-8');

  await targetDb.exec(downSql);
  return { success: true, direction: 'DOWN' };
}

// CLI invocation support
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  const action = process.argv[2] || 'up';
  (async () => {
    const db = await getDb();
    if (action.toLowerCase() === 'down') {
      console.log('Running migration DOWN...');
      await runMigrationDown(db);
      console.log('Migration DOWN complete.');
    } else {
      console.log('Running migration UP...');
      await runMigrationUp(db);
      console.log('Migration UP complete.');
    }
  })().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
