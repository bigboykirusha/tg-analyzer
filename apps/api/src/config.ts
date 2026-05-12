import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  SESSION_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  COOKIE_SECURE: z.coerce.boolean().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_DOMAIN: z.string().min(1).optional(),
  REFRESH_SESSION_GRACE_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  FULL_PARSE_COOLDOWN_HOURS: z.coerce.number().int().positive().default(24),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
})

const rawConfig = envSchema.parse(process.env)
const cookieSecure = rawConfig.COOKIE_SECURE ?? rawConfig.NODE_ENV === 'production'
const cookieSameSite = rawConfig.COOKIE_SAME_SITE ?? (cookieSecure ? 'none' : 'lax')

export const config = {
  ...rawConfig,
  COOKIE_SECURE: cookieSecure,
  COOKIE_SAME_SITE: cookieSecure ? cookieSameSite : (cookieSameSite === 'none' ? 'lax' : cookieSameSite),
}

export const cookieName = 'tg_analyzer_refresh'
