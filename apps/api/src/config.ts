import { z } from 'zod'
import { loadEnvFiles } from './lib/env-files'

loadEnvFiles()

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  /** Set by most hosting platforms; used when API_PORT is absent. */
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.url().refine((value) => /^postgres(?:ql)?:/.test(value), 'Expected a PostgreSQL URL'),
  REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value), 'Expected a Redis URL'),
  /** `fake` serves generated chats for local development and demos; never allowed in production. */
  TELEGRAM_MODE: z.enum(['live', 'fake']).default('live'),
  TELEGRAM_API_ID: z.coerce.number().int().positive().optional(),
  TELEGRAM_API_HASH: z.string().min(16).optional(),
  SESSION_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'Expected 64 hex characters'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_SECURE: booleanFlag.optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z
    .string()
    .regex(/^\.?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)
    .optional(),
  REFRESH_SESSION_GRACE_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  CHAT_REPARSE_COOLDOWN_MINUTES: z.coerce.number().int().min(0).default(60),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
})

export type AppConfig = ReturnType<typeof parseConfig>

const PLACEHOLDER_SECRET = /change|example|placeholder|0123456789abcdef/i

export function parseConfig(env: Record<string, string | undefined>) {
  // `KEY=` in an env file means «not set», like a missing line (.env.example ships them empty).
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''))
  const result = envSchema.safeParse(present)
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    throw new Error(`Invalid configuration: ${fields.join(', ')}`)
  }

  const raw = result.data
  const production = raw.NODE_ENV === 'production'
  const cookieSecure = raw.COOKIE_SECURE ?? production
  const allowedOrigins = [
    ...new Set(
      raw.CORS_ORIGIN.split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
  const errors: string[] = []

  for (const origin of allowedOrigins) {
    if (origin === '*') {
      if (production) errors.push('CORS_ORIGIN must not be a wildcard in production')
      continue
    }
    try {
      const url = new URL(origin)
      if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) errors.push(`CORS_ORIGIN "${origin}"`)
      else if (production && url.protocol !== 'https:') errors.push('CORS_ORIGIN must use https in production')
    } catch {
      errors.push(`CORS_ORIGIN "${origin}"`)
    }
  }

  if (raw.COOKIE_SAME_SITE === 'none' && !cookieSecure) errors.push('COOKIE_SAME_SITE=none requires COOKIE_SECURE')
  if (raw.JWT_SECRET === raw.JWT_REFRESH_SECRET) errors.push('JWT secrets must differ')
  if (raw.TELEGRAM_MODE === 'live' && (!raw.TELEGRAM_API_ID || !raw.TELEGRAM_API_HASH)) {
    errors.push('TELEGRAM_API_ID and TELEGRAM_API_HASH are required (or set TELEGRAM_MODE=fake for local demos)')
  }
  if (production) {
    if (raw.TELEGRAM_MODE === 'fake') errors.push('TELEGRAM_MODE=fake is not allowed in production')
    if (!cookieSecure) errors.push('COOKIE_SECURE must be true in production')
    const secrets = [raw.TELEGRAM_API_HASH ?? '', raw.JWT_SECRET, raw.JWT_REFRESH_SECRET, raw.SESSION_ENCRYPTION_KEY]
    if (secrets.some((value) => PLACEHOLDER_SECRET.test(value) || new Set(value).size < 8)) {
      errors.push('secrets look like placeholders')
    }
  }

  if (errors.length) throw new Error(`Invalid configuration: ${errors.join('; ')}`)

  return {
    ...raw,
    API_PORT: raw.API_PORT ?? raw.PORT ?? 3001,
    COOKIE_SECURE: cookieSecure,
    ALLOWED_ORIGINS: allowedOrigins,
    TELEGRAM_API_ID: raw.TELEGRAM_API_ID ?? 0,
    TELEGRAM_API_HASH: raw.TELEGRAM_API_HASH ?? '',
  }
}

export const config = parseConfig(process.env)

export const REFRESH_COOKIE_NAME = 'tg_analyzer_refresh'
