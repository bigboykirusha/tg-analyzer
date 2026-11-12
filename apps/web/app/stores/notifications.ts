import type { NotificationDto } from '@tg-analyzer/shared'
import { api } from '../composables/useApi'

/**
 * «Уведомления»: the unread count for the bell (phone header, desktop sidebar) and the list of the page. Opening
 * the page reads everything on it, as a notification centre does; the rows that were new keep their dot for that
 * visit.
 */
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unread: 0,
    items: [] as NotificationDto[],
    state: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  }),

  actions: {
    async loadUnread() {
      try {
        this.unread = (await api('GET /api/v1/notifications/unread')).unread
      } catch {
        // The count is a hint; the page shows the truth.
      }
    },

    async open() {
      this.state = this.items.length ? 'ready' : 'loading'
      try {
        const result = await api('GET /api/v1/notifications')
        this.items = result.notifications
        this.state = 'ready'
        if (result.unread) await api('POST /api/v1/notifications/read')
        this.unread = 0
      } catch {
        if (!this.items.length) this.state = 'error'
      }
    },
  },
})
