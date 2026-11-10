import {
  ANALYZABLE_CHAT_TYPES,
  HOME_MIN_NEW_MESSAGES,
  MIN_REPORT_MESSAGES,
  type ChatType,
  type DialogDto,
  type RecentActivityResponse,
  type ReportDto,
  type ReportSummaryDto,
} from '@tg-analyzer/shared'
import { api, ApiClientError } from '../composables/useApi'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/** A chat as shown on the dashboard: a Telegram dialog, its report, or both. */
export interface WorkspaceChat {
  id: string
  title: string
  type: ChatType
  hasAvatar: boolean
  /** Missing in dialog lists cached by older versions. */
  lastMessageAt?: string | null
  /** Pinned in Telegram; missing for chats known only from a report. */
  pinned?: boolean
  /** Known to have fewer messages than a report needs: no «Разобрать». */
  tooSmall?: boolean
  report: ReportSummaryDto | null
}

const DIALOG_CACHE_KEY = 'tg-analyzer:dialogs'

function readCachedDialogs(userId: string): DialogDto[] {
  try {
    const cached = JSON.parse(localStorage.getItem(DIALOG_CACHE_KEY) ?? 'null') as {
      userId: string
      dialogs: DialogDto[]
    } | null
    return cached?.userId === userId ? cached.dialogs : []
  } catch {
    return []
  }
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    dialogs: [] as DialogDto[],
    dialogsState: 'idle' as LoadState,
    dialogsError: null as ApiClientError | null,
    /** True while Telegram is busy and the list comes from the server cache. */
    dialogsStale: false,
    dialogsTruncated: false,
    reports: [] as ReportSummaryDto[],
    reportsState: 'idle' as LoadState,
    openedReports: {} as Record<string, ReportDto>,
    /** Private chats of the last month, counted by Telegram without an analysis. */
    recent: null as RecentActivityResponse | null,
    recentState: 'idle' as LoadState,
    recentError: null as ApiClientError | null,
  }),
  getters: {
    /** The busiest chats of the month without a report; chats Telegram says are too small for one are no suggestion. */
    suggestions(state): RecentActivityResponse['chats'] {
      const withReport = new Set(state.reports.map((report) => report.chatId))
      return (state.recent?.chats ?? []).filter(
        (chat) => !withReport.has(chat.id) && (chat.total === undefined || chat.total >= MIN_REPORT_MESSAGES),
      )
    },
    /** New messages in a chat since its report, by chat id: Telegram's size now minus the report's; only real news. */
    newMessages(state): Record<string, number> {
      const added: Record<string, number> = {}
      const reports = new Map(state.reports.map((report) => [report.chatId, report]))
      for (const chat of state.recent?.chats ?? []) {
        const report = reports.get(chat.id)
        if (!report || chat.total === undefined) continue
        const diff = chat.total - report.totalMessages
        if (diff >= HOME_MIN_NEW_MESSAGES) added[chat.id] = diff
      }
      return added
    },
    chats(state): WorkspaceChat[] {
      const reports = new Map(state.reports.map((report) => [report.chatId, report]))
      const chats: WorkspaceChat[] = state.dialogs
        .filter((dialog) => (ANALYZABLE_CHAT_TYPES as readonly ChatType[]).includes(dialog.type))
        .map((dialog) => ({ ...dialog, report: reports.get(dialog.id) ?? null }))
      // Reports of chats the user has since left stay reachable.
      const listed = new Set(chats.map((chat) => chat.id))
      for (const report of state.reports) {
        if (!listed.has(report.chatId)) {
          chats.push({ id: report.chatId, title: report.title, type: report.type, hasAvatar: false, report })
        }
      }
      return chats
    },
  },
  actions: {
    async loadDialogs() {
      const auth = useAuthStore()
      const version = auth.sessionVersion
      if (!this.dialogs.length && auth.user) this.dialogs = readCachedDialogs(auth.user.id)
      this.dialogsState = 'loading'
      this.dialogsError = null
      try {
        const result = await api('GET /api/v1/parse/dialogs')
        if (auth.sessionVersion !== version) return
        this.dialogs = result.dialogs
        this.dialogsStale = result.stale
        this.dialogsTruncated = result.truncated
        this.dialogsState = 'ready'
        if (auth.user)
          localStorage.setItem(DIALOG_CACHE_KEY, JSON.stringify({ userId: auth.user.id, dialogs: result.dialogs }))
      } catch (error) {
        if (auth.sessionVersion !== version) return
        this.dialogsError = error instanceof ApiClientError ? error : null
        this.dialogsState = 'error'
      }
    },

    async loadRecent() {
      const auth = useAuthStore()
      const version = auth.sessionVersion
      if (this.recentState === 'loading') return
      this.recentState = 'loading'
      this.recentError = null
      try {
        const result = await api('GET /api/v1/parse/recent')
        if (auth.sessionVersion !== version) return
        this.recent = result
        this.recentState = 'ready'
      } catch (error) {
        if (auth.sessionVersion !== version) return
        // With reports the summary is a bonus; for a newcomer it is the whole screen, so the error is kept.
        this.recentError = error instanceof ApiClientError ? error : null
        this.recentState = 'error'
      }
    },

    async loadReports() {
      const auth = useAuthStore()
      const version = auth.sessionVersion
      this.reportsState = this.reports.length ? 'ready' : 'loading'
      try {
        const result = await api('GET /api/v1/reports')
        if (auth.sessionVersion !== version) return
        this.reports = result.reports
        this.reportsState = 'ready'
      } catch (error) {
        if (auth.sessionVersion !== version) return
        this.reportsState = 'error'
        throw error
      }
    },

    /** `profanity: 'show'` asks for the owner's own full report; it is shown, never cached over the filtered one. */
    async loadReport(chatId: string, options: { profanity?: 'show' } = {}) {
      const auth = useAuthStore()
      const version = auth.sessionVersion
      const report = await api('GET /api/v1/reports/:chatId', {
        params: { chatId },
        query: options.profanity ? { profanity: options.profanity } : undefined,
      })
      if (auth.sessionVersion !== version) return null
      if (!options.profanity) this.openedReports[chatId] = report
      return report
    },

    async deleteReport(chatId: string) {
      const auth = useAuthStore()
      const version = auth.sessionVersion
      await api('DELETE /api/v1/reports/:chatId', { params: { chatId } })
      if (auth.sessionVersion !== version) return
      this.reports = this.reports.filter((report) => report.chatId !== chatId)
      delete this.openedReports[chatId]
    },

    /** A chat turned out too small for a report (the API or the worker said so): stop offering it. */
    markTooSmall(chatId: string) {
      this.dialogs = this.dialogs.map((dialog) => (dialog.id === chatId ? { ...dialog, tooSmall: true } : dialog))
      if (this.recent) this.recent = { ...this.recent, chats: this.recent.chats.filter((chat) => chat.id !== chatId) }
    },

    reset() {
      this.$reset()
      if (import.meta.client) localStorage.removeItem(DIALOG_CACHE_KEY)
    },
  },
})
