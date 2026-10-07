import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

// Load repo-root .env for local development, then allow optional app-local overrides.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: resolve(currentDir, '../../../.env'), quiet: true })
  dotenv.config({ path: resolve(currentDir, '../.env'), quiet: true })
}
