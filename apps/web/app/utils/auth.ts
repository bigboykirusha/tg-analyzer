import type { AuthErrorCode } from '@tg-analyzer/shared'

const TOKEN_REFRESH_THRESHOLD_MS = 60 * 1000

export function parseJwtPayload(token: string): { exp?: number } | null {
  if (!import.meta.client) {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    const encoded = parts[1]
    if (!encoded) {
      return null
    }

    const normalized = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encoded.length / 4) * 4, '=')

    return JSON.parse(window.atob(normalized)) as { exp?: number }
  } catch {
    return null
  }
}

export function isTokenExpiringSoon(token: string, thresholdMs = TOKEN_REFRESH_THRESHOLD_MS) {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) {
    return true
  }

  return payload.exp * 1000 <= Date.now() + thresholdMs
}

export function isTokenUsable(token: string, thresholdMs = 0) {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) {
    return false
  }

  return payload.exp * 1000 > Date.now() + thresholdMs
}

export function isDefinitiveAuthFailureCode(code?: string): code is Extract<AuthErrorCode, 'AUTH_REFRESH_INVALID' | 'AUTH_REFRESH_REPLAYED'> {
  return code === 'AUTH_REFRESH_INVALID' || code === 'AUTH_REFRESH_REPLAYED'
}
