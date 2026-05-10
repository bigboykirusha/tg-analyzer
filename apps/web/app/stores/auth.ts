import type { UserDto } from '@tg-analyzer/shared'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserDto | null,
    accessToken: '' as string,
    tempToken: '' as string,
    phoneCodeHash: '' as string,
    telegramSessionActive: true,
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
      if (import.meta.client) {
        localStorage.setItem('tg-analyzer-access-token', accessToken)
        localStorage.setItem('tg-analyzer-user', JSON.stringify(user))
      }
    },
    setTelegramSessionActive(active: boolean) {
      if (!this.user) {
        return
      }
      this.user = {
        ...this.user,
        telegramSessionActive: active,
      }
      this.telegramSessionActive = active
      if (import.meta.client) {
        localStorage.setItem('tg-analyzer-user', JSON.stringify(this.user))
      }
    },
    loadPersisted() {
      if (!import.meta.client) {
        return
      }
      this.accessToken = localStorage.getItem('tg-analyzer-access-token') ?? ''
      const rawUser = localStorage.getItem('tg-analyzer-user')
      try {
        this.user = rawUser ? JSON.parse(rawUser) as UserDto : null
      } catch {
        this.user = null
        localStorage.removeItem('tg-analyzer-user')
      }
      this.telegramSessionActive = this.user?.telegramSessionActive !== false
    },
    clear() {
      this.user = null
      this.accessToken = ''
      this.tempToken = ''
      this.phoneCodeHash = ''
      this.telegramSessionActive = true
      if (import.meta.client) {
        localStorage.removeItem('tg-analyzer-access-token')
        localStorage.removeItem('tg-analyzer-user')
      }
    },
  },
})
