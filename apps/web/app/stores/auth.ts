import type { UserDto } from '@tg-analyzer/shared'

export type AuthHealth = 'ready' | 'degraded' | 'unauthenticated'
const PARSE_DIALOGS_STORAGE_PREFIX = 'tg-analyzer-parse-dialogs:'
const AUTH_STORAGE_KEY = 'tg-analyzer-auth'

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
    persistAuth() {
      if (import.meta.client) localStorage.removeItem(AUTH_STORAGE_KEY)
    },
    setAccess(accessToken: string, user: UserDto) {
      this.accessToken = accessToken
      this.user = user
      this.tempToken = ''
      this.phoneCodeHash = ''
      this.telegramSessionActive = user.telegramSessionActive !== false
      this.authHealth = this.telegramSessionActive ? 'ready' : 'degraded'
      this.persistAuth()
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
      this.persistAuth()
    },
    updateUser(user: UserDto) {
      this.user = user
      this.telegramSessionActive = user.telegramSessionActive !== false
      this.authHealth = this.isAuthorized ? (this.telegramSessionActive ? 'ready' : 'degraded') : 'unauthenticated'
      this.persistAuth()
    },
    setAuthHealth(health: AuthHealth) {
      this.authHealth = health
    },
    loadPersisted() {
      this.persistAuth()
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
        localStorage.removeItem(AUTH_STORAGE_KEY)
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
