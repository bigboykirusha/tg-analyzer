import type { AuthSuccessResponse, UserDto } from '@tg-analyzer/shared'
import { clearAvatarCache } from '../lib/avatar-loader'

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

/**
 * A plain, non-secret hint that this browser is signed in, so server-rendered public pages already show
 * «Мои отчёты» instead of «Войти». It proves nothing: the dashboard still checks the session.
 */
export const SIGNED_IN_HINT = 'tg-analyzer-signed-in'

function setSignedInHint(on: boolean) {
  if (!import.meta.client) return
  document.cookie = on
    ? `${SIGNED_IN_HINT}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    : `${SIGNED_IN_HINT}=; path=/; max-age=0; samesite=lax`
}

/** The access token lives only in memory; the refresh token is an HttpOnly cookie. */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserDto | null,
    accessToken: '',
    status: 'unknown' as SessionStatus,
    /** Changes across sign-out/account switches, but not an ordinary token refresh. */
    sessionVersion: 0,
  }),
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
    telegramSessionActive: (state) => state.user?.telegramSessionActive ?? false,
  },
  actions: {
    signIn(result: AuthSuccessResponse) {
      if (this.user?.id !== result.user.id) this.sessionVersion += 1
      this.accessToken = result.accessToken
      this.user = result.user
      this.status = 'authenticated'
      setSignedInHint(true)
    },
    updateUser(user: UserDto) {
      this.user = user
    },
    markTelegramSessionInactive() {
      if (this.user) this.user = { ...this.user, telegramSessionActive: false }
    },
    signOut() {
      this.sessionVersion += 1
      clearAvatarCache()
      this.user = null
      this.accessToken = ''
      this.status = 'anonymous'
      setSignedInHint(false)
    },
  },
})
