import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Local development reads the repository-level .env, then an optional
 * app-level override. Deployed services receive real environment variables
 * and do not ship .env files. Called explicitly (not as an import side effect)
 * because bundlers may reorder side-effect-only imports.
 */
export function loadEnvFiles() {
  if (process.env.NODE_ENV === 'test') return
  // src/lib or dist → walk up to the apps/api directory.
  let appDir = dirname(fileURLToPath(import.meta.url))
  while (!existsSync(resolve(appDir, 'package.json')) && dirname(appDir) !== appDir) appDir = dirname(appDir)
  dotenv.config({ path: resolve(appDir, '../../.env'), quiet: true })
  dotenv.config({ path: resolve(appDir, '.env'), quiet: true })
}
