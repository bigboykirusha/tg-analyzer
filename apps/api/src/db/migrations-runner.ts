import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

/** Postgres advisory lock taken while migrating, so the API and the worker never migrate at once. */
const MIGRATION_LOCK_ID = 7_351_046_021

/** Tables the current code writes to; a database without them has not been migrated. */
const REQUIRED_TABLES = ['users', 'parse_jobs', 'chat_reports', 'people_overviews']

/** Finds the SQL migrations both from sources (tsx) and from the bundle in dist/. */
function migrationsFolder() {
  if (process.env.MIGRATIONS_DIR) return process.env.MIGRATIONS_DIR
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, 'migrations'),
    resolve(here, '../src/db/migrations'),
    resolve(here, '../../src/db/migrations'),
  ]
  const found = candidates.find((folder) => existsSync(resolve(folder, 'meta/_journal.json')))
  if (!found) throw new Error(`SQL migrations not found; looked in ${candidates.join(', ')}`)
  return found
}

/**
 * Applies pending migrations. The API and the worker call this on start, so a
 * deploy can never run new code against an old schema — which made analyses
 * read every message and then fail on saving the report, again and again.
 */
export async function applyMigrations(connectionString: string) {
  const client = new pg.Client({ connectionString })
  // Neon and similar hosts may drop idle connections; an error here must not crash the process.
  client.on('error', () => undefined)
  await client.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID])
    await migrate(drizzle(client), { migrationsFolder: migrationsFolder() })
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined)
    await client.end().catch(() => undefined)
  }
}

/** Throws with a clear message when tables the code needs are missing. */
export async function assertSchema(pool: pg.Pool) {
  const { rows } = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)",
    [REQUIRED_TABLES],
  )
  const present = new Set(rows.map((row) => row.table_name))
  const missing = REQUIRED_TABLES.filter((table) => !present.has(table))
  if (missing.length) {
    throw new Error(`Database schema is out of date: missing ${missing.join(', ')}. Run the migrations.`)
  }
}

/** Off only when a deploy pipeline migrates on its own and wants to keep it that way. */
export function shouldMigrateOnStart() {
  return process.env.MIGRATE_ON_START !== 'false'
}
