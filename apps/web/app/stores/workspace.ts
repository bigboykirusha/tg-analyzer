import {
  ANALYZABLE_CHAT_TYPES,
  type ChatType,
  type DialogDto,
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
  }),
  getters: {
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
      if (!this.dialogs.length && auth.user) this.dialogs = readCachedDialogs(auth.user.id)
      this.dialogsState = 'loading'
      this.dialogsError = null
      try {
        const result = await api('GET /api/v1/parse/dialogs')
        this.dialogs = result.dialogs
        this.dialogsStale = result.stale
        this.dialogsTruncated = result.truncated
        this.dialogsState = 'ready'
        if (auth.user)
          localStorage.setItem(DIALOG_CACHE_KEY, JSON.stringify({ userId: auth.user.id, dialogs: result.dialogs }))
      } catch (error) {
        this.dialogsError = error instanceof ApiClientError ? error : null
        this.dialogsState = 'error'
      }
    },

    async loadReports() {
      this.reportsState = this.reports.length ? 'ready' : 'loading'
      try {
        this.reports = (await api('GET /api/v1/reports')).reports
        this.reportsState = 'ready'
      } catch (error) {
        this.reportsState = 'error'
        throw error
      }
    },

    async loadReport(chatId: string) {
      const report = await api('GET /api/v1/reports/:chatId', { params: { chatId } })
      this.openedReports[chatId] = report
      return report
    },

    async deleteReport(chatId: string) {
      await api('DELETE /api/v1/reports/:chatId', { params: { chatId } })
      this.reports = this.reports.filter((report) => report.chatId !== chatId)
      delete this.openedReports[chatId]
    },

    reset() {
      this.$reset()
      if (import.meta.client) localStorage.removeItem(DIALOG_CACHE_KEY)
    },
  },
})
