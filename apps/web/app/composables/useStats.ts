import type {
  ActivityResponse,
  ChatStatsDto,
  ClearHistoryResponse,
  DeleteResponse,
  GlobalStatsDto,
  PagedChatsResponse,
  ParseDialogsResponse,
  ParseStatusResponse,
  ParseHistoryItem,
} from '@tg-analyzer/shared'

export function useStats() {
  const store = useStatsStore()

  async function fetchGlobal() {
    store.globalStats = await useApiFetch<GlobalStatsDto>('/api/stats/global')
  }

  async function fetchChats(page = 1) {
    const result = await useApiFetch<PagedChatsResponse>(`/api/stats/chats?page=${page}&limit=20&sort=total_messages&order=desc`)
    store.chats = result.chats
  }

  async function fetchChat(chatId: string) {
    store.selectedChat = await useApiFetch<ChatStatsDto>(`/api/stats/chats/${chatId}`)
  }

  async function deleteChat(chatId: string) {
    await useApiFetch<DeleteResponse>(`/api/stats/chats/${chatId}`, { method: 'DELETE' })
    store.chats = store.chats.filter((chat) => chat.tgChatId !== chatId)
    if (store.selectedChat?.tgChatId === chatId) {
      store.selectedChat = null
    }
  }

  async function fetchActivity() {
    const result = await useApiFetch<ActivityResponse>('/api/stats/activity')
    store.activity = result.daily
  }

  async function fetchHistory() {
    store.history = await useApiFetch<ParseHistoryItem[]>('/api/parse/history')
  }

  async function clearHistory() {
    await useApiFetch<ClearHistoryResponse>('/api/parse/history', { method: 'DELETE' })
    store.history = store.history.filter((item) => item.status === 'pending' || item.status === 'running')
  }

  async function fetchParseStatus() {
    return useApiFetch<ParseStatusResponse>('/api/parse/status')
  }

  async function fetchParseDialogs() {
    const result = await useApiFetch<ParseDialogsResponse>('/api/parse/dialogs')
    store.parseDialogs = result.dialogs
    store.parseDialogsTruncated = result.truncated
    store.parseDialogsTotal = result.total
  }

  return {
    fetchGlobal,
    fetchChats,
    fetchChat,
    deleteChat,
    fetchActivity,
    fetchHistory,
    clearHistory,
    fetchParseStatus,
    fetchParseDialogs,
  }
}
