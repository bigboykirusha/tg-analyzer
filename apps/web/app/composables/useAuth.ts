import type { AuthSuccessResponse, VerifyCodeBody, VerifyPasswordBody } from '@tg-analyzer/shared'
import { refreshAccessToken, useApiEndpoint } from './useApi'
import { isDefinitiveAuthFailureCode, isTokenExpiringSoon, isTokenUsable } from '../utils/auth'

let bootstrapPromise: Promise<AuthSuccessResponse | null> | null = null

export function useAuth() {
  const auth = useAuthStore()
  const config = useRuntimeConfig()
  const parseProgress = useParseProgress()

  function getPersistedSession() {
    if (!auth.isAuthorized || !auth.user || !isTokenUsable(auth.accessToken)) {
      return null
    }

    return {
      accessToken: auth.accessToken,
      user: auth.user,
    } satisfies AuthSuccessResponse
  }

  async function restoreSession(allowPersistedFallback = false) {
    const result = await refreshAccessToken(config.public.apiUrl)

    if (result.accessToken && result.user) {
      return {
        accessToken: result.accessToken,
        user: result.user,
      } satisfies AuthSuccessResponse
    }

    if (result.definitiveFailure && result.error?.code && isDefinitiveAuthFailureCode(result.error.code)) {
      return null
    }

    if (allowPersistedFallback) {
      return getPersistedSession()
    }

    return null
  }

  async function runBootstrap() {
    auth.loadPersisted()
    const persistedSession = getPersistedSession()

    if (persistedSession) {
      auth.setAuthHealth(auth.telegramSessionActive ? 'ready' : 'degraded')

      if (!isTokenExpiringSoon(auth.accessToken)) {
        return persistedSession
      }

      return (await restoreSession(true)) ?? persistedSession
    }

    return restoreSession(false)
  }

  async function bootstrap() {
    if (bootstrapPromise) {
      return bootstrapPromise
    }

    bootstrapPromise = runBootstrap().finally(() => {
      bootstrapPromise = null
    })

    return bootstrapPromise
  }

  async function sendCode(phone: string) {
    const result = await useApiEndpoint('POST /api/v1/auth/send-code', {
      body: { phone },
    })
    auth.phoneCodeHash = result.phoneCodeHash
    return result
  }

  async function verifyCode(payload: VerifyCodeBody) {
    const result = await useApiEndpoint('POST /api/v1/auth/verify-code', {
      body: payload,
    })

    if ('isPasswordRequired' in result && result.isPasswordRequired) {
      auth.tempToken = result.tempToken
      return result
    }

    if (!('accessToken' in result)) {
      throw new Error('Unexpected Telegram authentication response')
    }

    auth.setAccess(result.accessToken, result.user)
    return result
  }

  async function verifyPassword(payload: VerifyPasswordBody) {
    const result = await useApiEndpoint('POST /api/v1/auth/verify-password', {
      body: payload,
      headers: {
        Authorization: `Bearer ${auth.tempToken}`,
      },
    })
    auth.setAccess(result.accessToken, result.user)
    auth.tempToken = ''
    return result
  }

  async function refresh() {
    return restoreSession()
  }

  async function logout() {
    try {
      await useApiEndpoint('POST /api/v1/auth/logout')
    } finally {
      parseProgress.disconnect()
      parseProgress.reset()
      auth.clear()
      await navigateTo('/login', { replace: true })
    }
  }

  async function deleteAccount() {
    await useApiEndpoint('DELETE /api/v1/auth/account')
    parseProgress.disconnect()
    parseProgress.reset()
    auth.clear()
    await navigateTo('/login', { replace: true })
  }

  async function updateProfile(timezone: string) {
    const result = await useApiEndpoint('PATCH /api/v1/auth/profile', {
      body: { timezone },
    })
    auth.updateUser(result.user)
    return result.user
  }

  return {
    bootstrap,
    sendCode,
    verifyCode,
    verifyPassword,
    refresh,
    updateProfile,
    logout,
    deleteAccount,
  }
}
