import type { UserDto } from '@tg-analyzer/shared'

export type AuthHealth = 'ready' | 'degraded' | 'unauthenticated'

const ACCESS_TOKEN_STORAGE_KEY = 'tg-analyzer-access-token'
const USER_STORAGE_KEY = 'tg-analyzer-user'
const PARSE_DIALOGS_STORAGE_PREFIX = 'tg-analyzer-parse-dialogs:'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserDto | null,
    accessToken: '' as string,
    tempToken: '' as string,
    phoneCodeHash: '' as string,
    telegramSessionActive: true,
    authHealth: 'unauthenticated' as AuthHealth,
    hydrated: false,
  }),
  getters: {
    isAuthorized: (state) => Boolean(state.accessToken && state.user),
  },
  actions: {
    setAccess(accessToken: string, user: UserDto) {
      this.accessToken = accessToken
      this.user = user
      this.tempToken = ''
      this.phoneCodeHash = ''
      this.telegramSessionActive = user.telegramSessionActive !== false
      this.authHealth = this.telegramSessionActive ? 'ready' : 'degraded'
      if (import.meta.client) {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }
    },
    setTelegramSessionActive(active: boolean) {
      this.telegramSessionActive = active
      this.authHealth = this.isAuthorized ? (active ? 'ready' : 'degraded') : 'unauthenticated'
      if (!this.user) {
        return
      }
      this.user = {
        ...this.user,
        telegramSessionActive: active,
      }
      if (import.meta.client) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user))
      }
    },
    setAuthHealth(health: AuthHealth) {
      this.authHealth = health
    },
    loadPersisted() {
      if (!import.meta.client) {
        return
      }

      if (this.hydrated) {
        return
      }

      const persistedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? ''
      const rawUser = localStorage.getItem(USER_STORAGE_KEY)

      this.accessToken = persistedAccessToken
      try {
        this.user = rawUser ? JSON.parse(rawUser) as UserDto : null
      } catch {
        this.user = null
        localStorage.removeItem(USER_STORAGE_KEY)
      }

      if (!this.user || !this.accessToken) {
        this.user = null
        this.accessToken = ''
        this.telegramSessionActive = true
        this.authHealth = 'unauthenticated'
        this.hydrated = true
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        return
      }

      this.telegramSessionActive = this.user.telegramSessionActive !== false
      this.authHealth = this.telegramSessionActive ? 'ready' : 'degraded'
      this.hydrated = true
    },
    clear() {
      this.user = null
      this.accessToken = ''
      this.tempToken = ''
      this.phoneCodeHash = ''
      this.telegramSessionActive = true
      this.authHealth = 'unauthenticated'
      this.hydrated = true
      useStatsStore().reset()
      if (import.meta.client) {
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index)
          if (key?.startsWith(PARSE_DIALOGS_STORAGE_PREFIX)) {
            localStorage.removeItem(key)
          }
        }
      }
    },
  },
})
