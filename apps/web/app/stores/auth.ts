import type { AuthSuccessResponse, UserDto } from '@tg-analyzer/shared'

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

/** The access token lives only in memory; the refresh token is an HttpOnly cookie. */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserDto | null,
    accessToken: '',
    status: 'unknown' as SessionStatus,
  }),
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
    telegramSessionActive: (state) => state.user?.telegramSessionActive ?? false,
  },
  actions: {
    signIn(result: AuthSuccessResponse) {
      this.accessToken = result.accessToken
      this.user = result.user
      this.status = 'authenticated'
    },
    updateUser(user: UserDto) {
      this.user = user
    },
    markTelegramSessionInactive() {
      if (this.user) this.user = { ...this.user, telegramSessionActive: false }
    },
    signOut() {
      this.user = null
      this.accessToken = ''
      this.status = 'anonymous'
    },
  },
})
