#!/usr/bin/env node

/**
 * Furniture Hub - Automated Database & Schema Sync
 * Synchronizes local SQL schemas (supabase/schema.sql & prisma migrations)
 * directly to the live PostgreSQL / Supabase database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runMigrationUp } from '../src/db/migrate.js';
import { closeDb } from '../src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Simple, zero-dependency .env reader
 */
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          env[key] = val;
        }
      }
    }
  }
  return env;
}

/**
 * Extract Supabase project ref from URL
 */
function getProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
  return match ? match[1] : null;
}

/**
 * Execute schema.sql against PostgreSQL database
 */
async function pushToPostgres(connectionString, sqlContent) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    console.log('⚡ Connected to PostgreSQL. Applying schema updates...');
    await client.query(sqlContent);
    console.log('✅ PostgreSQL / Supabase database schema updated successfully!');
    return true;
  } finally {
    await client.end();
  }
}

/**
 * Execute schema.sql via Supabase Management API
 */
async function pushViaManagementApi(projectRef, accessToken, sqlContent) {
  console.log(`⚡ Pushing schema to Supabase project [${projectRef}] via Management API...`);
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query: sqlContent })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase Management API Error (${response.status}): ${errorText}`);
  }

  console.log('✅ Supabase Cloud database & schemas successfully updated via API!');
  return true;
}

/**
 * Main push workflow
 */
export async function pushDatabaseSchemas() {
  const env = loadEnv();
  const schemaSqlPath = path.join(ROOT_DIR, 'supabase', 'schema.sql');

  if (!fs.existsSync(schemaSqlPath)) {
    throw new Error(`Schema file not found at: ${schemaSqlPath}`);
  }

  const sqlContent = fs.readFileSync(schemaSqlPath, 'utf-8');
  const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || env.SUPABASE_DB_URL;
  const accessToken = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_TOKEN;
  const projectRef = getProjectRef(env.VITE_SUPABASE_URL);

  console.log('\n======================================================');
  console.log('🚀 Furniture Hub - Database & Schema Sync');
  console.log('======================================================');

  // 1. Sync local embedded PGlite database
  try {
    console.log('📦 Syncing local embedded database...');
    await runMigrationUp();
    await closeDb();
    console.log('✅ Local embedded database schema up to date.');
  } catch (err) {
    console.warn('⚠️  Local migration notice:', err.message);
  }

  // 2. Sync live Supabase Cloud database
  let cloudUpdated = false;

  if (databaseUrl) {
    try {
      console.log('☁️  Found DATABASE_URL. Connecting to live database...');
      await pushToPostgres(databaseUrl, sqlContent);
      cloudUpdated = true;
    } catch (err) {
      console.error('❌ Failed to push to PostgreSQL via DATABASE_URL:', err.message);
    }
  } else if (accessToken && projectRef) {
    try {
      console.log('☁️  Found SUPABASE_ACCESS_TOKEN. Connecting via Supabase Management API...');
      await pushViaManagementApi(projectRef, accessToken, sqlContent);
      cloudUpdated = true;
    } catch (err) {
      console.error('❌ Failed to push via Supabase Management API:', err.message);
    }
  } else {
    console.log('\nℹ️  Supabase Cloud Direct Connection:');
    console.log('   To push directly to your cloud Supabase database automatically,');
    console.log('   add your DATABASE_URL to your .env file:');
    console.log('   DATABASE_URL=postgresql://postgres.' + (projectRef || 'your-ref') + ':[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres');
    console.log('   (Found in Supabase Dashboard -> Project Settings -> Database -> Connection String -> URI)\n');
  }

  console.log('======================================================\n');
  return { local: true, cloud: cloudUpdated };
}

// Watch mode for live automatic updates on save
if (process.argv.includes('--watch')) {
  console.log('👀 Watching supabase/schema.sql for changes...');
  const schemaFile = path.join(ROOT_DIR, 'supabase', 'schema.sql');
  
  // Run once immediately
  pushDatabaseSchemas().catch(console.error);

  let debounceTimer = null;
  fs.watch(schemaFile, (eventType) => {
    if (eventType === 'change') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('\n📝 Detected changes in schema.sql. Re-syncing database...');
        pushDatabaseSchemas().catch(console.error);
      }, 500);
    }
  });
} else if (process.argv[1] && process.argv[1].endsWith('db-push.js')) {
  pushDatabaseSchemas().catch(err => {
    console.error('Database sync failed:', err);
    process.exit(1);
  });
}
