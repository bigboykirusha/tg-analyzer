import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { config } from '../config'
import { logger } from '../lib/logger'
import * as schema from './schema'

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

// Hosted Postgres (Neon) terminates idle connections. The pool then emits
// 'error' for the dead idle client; without a listener Node treats it as an
// uncaught exception and the whole process — the worker mid-analysis — exits.
// The pool already drops the client and opens a new one on the next query.
pool.on('error', (error) => logger.warn({ err: error }, 'idle database connection closed'))

export const db = drizzle(pool, { schema })
export type Database = typeof db
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export { schema }
