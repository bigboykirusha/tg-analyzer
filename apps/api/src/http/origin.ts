import { config } from '../config'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function parseOrigin(value: string) {
  try {
    const url = new URL(value)
    return url.origin === value ? url : null
  } catch {
    return null
  }
}

/**
 * Exact match against the configured origins. Outside production, loopback
 * aliases (localhost / 127.0.0.1) on the same port are treated as equivalent.
 */
export function isOriginAllowed(
  origin: string,
  allowedOrigins: readonly string[] = config.ALLOWED_ORIGINS,
  environment = config.NODE_ENV,
) {
  if (allowedOrigins.includes(origin)) return true
  if (environment === 'production') return false
  if (allowedOrigins.includes('*')) return true

  const request = parseOrigin(origin)
  if (!request || !LOOPBACK_HOSTS.has(request.hostname)) return false

  return allowedOrigins.some((allowed) => {
    const configured = parseOrigin(allowed)
    return (
      configured !== null &&
      LOOPBACK_HOSTS.has(configured.hostname) &&
      configured.protocol === request.protocol &&
      configured.port === request.port
    )
  })
}
