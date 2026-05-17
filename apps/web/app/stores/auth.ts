import type { UserDto } from '@tg-analyzer/shared'

export type AuthHealth = 'ready' | 'degraded' | 'unauthenticated'
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
    },
    setAuthHealth(health: AuthHealth) {
      this.authHealth = health
    },
    loadPersisted() {
      if (this.hydrated) {
        return
      }
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
