import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.url().refine((value) => /^postgres(?:ql)?:/.test(value)),
  REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value)),
  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(16),
  SESSION_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_DOMAIN: z
    .string()
    .regex(/^\.?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)
    .optional(),
  REFRESH_SESSION_GRACE_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  FULL_PARSE_COOLDOWN_HOURS: z.coerce.number().int().positive().default(24),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
})

export function parseConfig(env: Record<string, string | undefined>) {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const invalidFields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    throw new Error(`Invalid configuration: ${invalidFields.join(', ')}`)
  }

  const raw = result.data
  const apiPort = env.API_PORT ? Number(env.API_PORT) : (raw.PORT ?? raw.API_PORT)
  const secure = raw.COOKIE_SECURE ?? raw.NODE_ENV === 'production'
  const sameSite = raw.COOKIE_SAME_SITE ?? (secure ? 'none' : 'lax')
  const origins = [...new Set(raw.CORS_ORIGIN.split(',').map((value) => value.trim()))]

  if (
    origins.some((value) => {
      if (value === '*') {
        return raw.NODE_ENV === 'production'
      }

      try {
        const url = new URL(value)
        return (
          url.origin !== value ||
          !['http:', 'https:'].includes(url.protocol) ||
          (raw.NODE_ENV === 'production' && url.protocol !== 'https:')
        )
      } catch {
        return true
      }
    })
  ) {
    throw new Error('Invalid configuration: CORS_ORIGIN')
  }

  if (sameSite === 'none' && !secure) {
    throw new Error('Invalid configuration: COOKIE_SAME_SITE requires COOKIE_SECURE')
  }
  if (raw.JWT_SECRET === raw.JWT_REFRESH_SECRET) {
    throw new Error('Invalid configuration: JWT secrets must be different')
  }
  const productionSecrets = [raw.TELEGRAM_API_HASH, raw.JWT_SECRET, raw.JWT_REFRESH_SECRET, raw.SESSION_ENCRYPTION_KEY]
  if (
    raw.NODE_ENV === 'production' &&
    (!secure ||
      productionSecrets.some((value) => /change|example|test|0123456789abcdef/i.test(value) || new Set(value).size < 8))
  ) {
    throw new Error('Invalid production security configuration')
  }

  return { ...raw, API_PORT: apiPort, COOKIE_SECURE: secure, COOKIE_SAME_SITE: sameSite, ALLOWED_ORIGINS: origins }
}

export const config = parseConfig(process.env)
export const cookieName = 'tg_analyzer_refresh'
