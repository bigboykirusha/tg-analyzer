import type {
  AuthSuccessResponse,
  PendingPasswordResponse,
  SendCodeResponse,
  VerifyCodeBody,
  VerifyPasswordBody,
} from '@tg-analyzer/shared'
import { refreshAccessToken } from './useApi'
import { isDefinitiveAuthFailureCode, isTokenExpiringSoon } from '../utils/auth'

export function useAuth() {
  const auth = useAuthStore()
  const config = useRuntimeConfig()

  async function restoreSession() {
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

    if (auth.isAuthorized && auth.user) {
      return {
        accessToken: auth.accessToken,
        user: auth.user,
      } satisfies AuthSuccessResponse
    }

    return null
  }

  async function bootstrap() {
    auth.loadPersisted()

    if (auth.isAuthorized && auth.user) {
      auth.setAuthHealth(auth.telegramSessionActive ? 'ready' : 'degraded')

      if (!isTokenExpiringSoon(auth.accessToken)) {
        return {
          accessToken: auth.accessToken,
          user: auth.user,
        } satisfies AuthSuccessResponse
      }

      return await restoreSession() ?? {
        accessToken: auth.accessToken,
        user: auth.user,
      }
    }

    return restoreSession()
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
      auth.clear()
      await navigateTo('/login')
    }
  }

  async function terminateTelegramSession() {
    await useApiFetch('/api/auth/terminate-telegram', {
      method: 'POST',
    })
    auth.setTelegramSessionActive(false)
  }

  async function deleteAccount() {
    await useApiFetch('/api/auth/account', {
      method: 'DELETE',
    })
    auth.clear()
    await navigateTo('/login')
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
