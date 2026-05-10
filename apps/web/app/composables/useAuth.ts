import type {
  AuthSuccessResponse,
  PendingPasswordResponse,
  SendCodeResponse,
  VerifyCodeBody,
  VerifyPasswordBody,
} from '@tg-analyzer/shared'

export function useAuth() {
  const auth = useAuthStore()

  async function bootstrap() {
    auth.loadPersisted()
    if (!auth.accessToken) {
      return refresh()
    }
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
    try {
      const result = await useApiFetch<AuthSuccessResponse>('/api/auth/refresh', {
        method: 'POST',
      })
      auth.setAccess(result.accessToken, result.user)
      return result
    } catch {
      auth.clear()
      return null
    }
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
