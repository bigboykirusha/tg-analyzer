import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { loadEnvFiles } from './lib/env-files'

/**
 * Applies pending SQL migrations. Runs from the built bundle (`node dist/migrate.js`)
 * so production images do not need drizzle-kit. Only DATABASE_URL is required.
 */
loadEnvFiles()
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const migrationsFolder =
  process.env.MIGRATIONS_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '../src/db/migrations')

const pool = new pg.Pool({ connectionString, max: 1 })
try {
  await migrate(drizzle(pool), { migrationsFolder })
  console.log('Migrations applied')
} catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
