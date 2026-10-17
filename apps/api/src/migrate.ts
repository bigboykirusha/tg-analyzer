import { applyMigrations } from './db/migrations-runner'
import { loadEnvFiles } from './lib/env-files'

/**
 * Applies pending SQL migrations. Runs from the built bundle (`node dist/migrate.js`)
 * so production images do not need drizzle-kit. Only DATABASE_URL is required.
 * The API and the worker also migrate on start; this stays for deploy hooks and local use.
 */
loadEnvFiles()
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

try {
  await applyMigrations(connectionString)
  console.log('Migrations applied')
} catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
}
