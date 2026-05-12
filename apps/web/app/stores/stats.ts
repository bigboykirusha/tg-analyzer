import type { ActivityPointDto, ChatStatsDto, GlobalStatsDto, ParseDialogDto, ParseHistoryItem } from '@tg-analyzer/shared'

const PARSE_DIALOGS_STORAGE_PREFIX = 'tg-analyzer-parse-dialogs'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    globalStats: null as GlobalStatsDto | null,
    chats: [] as ChatStatsDto[],
    selectedChat: null as ChatStatsDto | null,
    activity: [] as ActivityPointDto[],
    history: [] as ParseHistoryItem[],
    parseDialogs: [] as ParseDialogDto[],
    parseDialogsTruncated: false,
    parseDialogsTotal: 0,
    selectedParseDialogIds: [] as string[],
  }),
  actions: {
    setParseDialogs(payload: {
      dialogs: ParseDialogDto[]
      truncated: boolean
      total: number
    }) {
      this.parseDialogs = payload.dialogs
      this.parseDialogsTruncated = payload.truncated
      this.parseDialogsTotal = payload.total
      this.persistParseDialogs()
    },
    hydrateParseDialogs() {
      if (!import.meta.client) {
        return
      }

      const auth = useAuthStore()
      const userId = auth.user?.id
      if (!userId) {
        return
      }

      const raw = localStorage.getItem(`${PARSE_DIALOGS_STORAGE_PREFIX}:${userId}`)
      if (!raw) {
        return
      }

      try {
        const parsed = JSON.parse(raw) as {
          dialogs?: ParseDialogDto[]
          truncated?: boolean
          total?: number
        }

        this.parseDialogs = Array.isArray(parsed.dialogs) ? parsed.dialogs : []
        this.parseDialogsTruncated = Boolean(parsed.truncated)
        this.parseDialogsTotal = typeof parsed.total === 'number' ? parsed.total : this.parseDialogs.length
      } catch {
        localStorage.removeItem(`${PARSE_DIALOGS_STORAGE_PREFIX}:${userId}`)
      }
    },
    persistParseDialogs() {
      if (!import.meta.client) {
        return
      }

      const auth = useAuthStore()
      const userId = auth.user?.id
      if (!userId) {
        return
      }

      localStorage.setItem(`${PARSE_DIALOGS_STORAGE_PREFIX}:${userId}`, JSON.stringify({
        dialogs: this.parseDialogs,
        truncated: this.parseDialogsTruncated,
        total: this.parseDialogsTotal,
      }))
    },
    reset() {
      this.globalStats = null
      this.chats = []
      this.selectedChat = null
      this.activity = []
      this.history = []
      this.parseDialogs = []
      this.parseDialogsTruncated = false
      this.parseDialogsTotal = 0
      this.selectedParseDialogIds = []
    },
  },
})
