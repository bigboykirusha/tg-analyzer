import type { AuthSuccessResponse, UpdateProfileBody, VerifyCodeResponse } from '@tg-analyzer/shared'
import { api, refreshSession } from './useApi'

let restoring: Promise<boolean> | null = null

export function useAuth() {
  const auth = useAuthStore()

  /** Restores the session from the refresh cookie once per page load. Throws when offline. */
  function restoreSession(): Promise<boolean> {
    if (auth.status !== 'unknown') return Promise.resolve(auth.isAuthenticated)
    restoring ??= refreshSession()
      .then((result) => Boolean(result))
      .finally(() => {
        restoring = null
      })
    return restoring
  }

  async function sendCode(phone: string) {
    return api('POST /api/v1/auth/send-code', { body: { phone } })
  }

  async function resendCode(body: { phone: string; phoneCodeHash: string }) {
    return api('POST /api/v1/auth/resend-code', { body })
  }

  async function verifyCode(body: { phone: string; code: string; phoneCodeHash: string }): Promise<VerifyCodeResponse> {
    const result = await api('POST /api/v1/auth/verify-code', { body })
    if ('accessToken' in result) auth.signIn(result)
    return result
  }

  async function verifyPassword(body: { tempToken: string; password: string }): Promise<AuthSuccessResponse> {
    const result = await api('POST /api/v1/auth/verify-password', { body })
    auth.signIn(result)
    return result
  }

  async function finishSession() {
    useAnalysis().stop()
    useWorkspaceStore().reset()
    auth.signOut()
    await navigateTo('/login', { replace: true })
  }

  async function logout() {
    try {
      await api('POST /api/v1/auth/logout')
    } finally {
      await finishSession()
    }
  }

  async function deleteAccount() {
    await api('DELETE /api/v1/auth/account')
    await finishSession()
  }

  async function updateSettings(body: UpdateProfileBody) {
    const { user } = await api('PATCH /api/v1/auth/profile', { body })
    auth.updateUser(user)
  }

  /** Re-reads the account, e.g. after the user pressed Start in the bot. */
  async function refreshUser() {
    const { user } = await api('GET /api/v1/auth/me')
    auth.updateUser(user)
  }

  /** Signs the app out of Telegram; the account and its reports stay. */
  async function disconnectTelegram() {
    const { user } = await api('POST /api/v1/auth/telegram/disconnect')
    void useAnalysis().refresh()
    auth.updateUser(user)
  }

  /** Keeps report bucketing aligned with the browser's time zone. */
  async function syncTimeZone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!auth.user || !timezone || timezone === auth.user.timezone) return
    const { user } = await api('PATCH /api/v1/auth/profile', { body: { timezone } })
    auth.updateUser(user)
  }

  return {
    restoreSession,
    sendCode,
    resendCode,
    verifyCode,
    verifyPassword,
    logout,
    deleteAccount,
    syncTimeZone,
    updateSettings,
    refreshUser,
    disconnectTelegram,
  }
}
