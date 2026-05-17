import type {
  AuthSuccessResponse,
  PendingPasswordResponse,
  SendCodeResponse,
  VerifyCodeBody,
  VerifyPasswordBody,
} from '@tg-analyzer/shared'
import { refreshAccessToken } from './useApi'
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

      return await restoreSession(true) ?? persistedSession
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
    const result = await useApiFetch<SendCodeResponse>('/api/auth/send-code', {
      method: 'POST',
      body: { phone },
    })
    auth.phoneCodeHash = result.phoneCodeHash
    return result
  }

  async function verifyCode(payload: VerifyCodeBody) {
    const result = await useApiFetch<AuthSuccessResponse | PendingPasswordResponse>('/api/auth/verify-code', {
      method: 'POST',
      body: payload,
    })

    if ('isPasswordRequired' in result && result.isPasswordRequired) {
      auth.tempToken = result.tempToken
      return result
    }

    const success = result as AuthSuccessResponse
    auth.setAccess(success.accessToken, success.user)
    return success
  }

  async function verifyPassword(payload: VerifyPasswordBody) {
    const result = await useApiFetch<AuthSuccessResponse>('/api/auth/verify-password', {
      method: 'POST',
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
      await useApiFetch('/api/auth/logout', {
        method: 'POST',
      })
    } finally {
      parseProgress.disconnect()
      parseProgress.reset()
      auth.clear()
      await navigateTo('/login', { replace: true })
    }
  }

  async function terminateTelegramSession() {
    await useApiFetch('/api/auth/terminate-telegram', {
      method: 'POST',
    })
    parseProgress.disconnect()
    parseProgress.reset()
    auth.setTelegramSessionActive(false)
  }

  async function deleteAccount() {
    await useApiFetch('/api/auth/account', {
      method: 'DELETE',
    })
    parseProgress.disconnect()
    parseProgress.reset()
    auth.clear()
    await navigateTo('/login', { replace: true })
  }

  return {
    bootstrap,
    sendCode,
    verifyCode,
    verifyPassword,
    refresh,
    logout,
    terminateTelegramSession,
    deleteAccount,
  }
}
