import { useApiEndpoint } from './useApi'

export function useStats() {
  const store = useStatsStore()
  store.hydrateParseDialogs()

  async function fetchGlobal() {
    store.globalStats = await useApiEndpoint('GET /api/v1/stats/global')
  }

  async function fetchChats(page = 1, sort = 'parsed_at', order: 'asc' | 'desc' = 'desc') {
    const result = await useApiEndpoint('GET /api/v1/stats/chats', {
      query: { page, limit: 20, sort, order },
    })
    store.chats = result.chats
  }

  async function fetchChat(chatId: string) {
    store.selectedChat = await useApiEndpoint('GET /api/v1/stats/chats/:chatId', { params: { chatId } })
  }

  async function deleteChat(chatId: string) {
    await useApiEndpoint('DELETE /api/v1/stats/chats/:chatId', { params: { chatId } })
    store.chats = store.chats.filter((chat) => chat.tgChatId !== chatId)
    if (store.selectedChat?.tgChatId === chatId) {
      store.selectedChat = null
    }
  }

  async function fetchActivity() {
    const result = await useApiEndpoint('GET /api/v1/stats/activity')
    store.activity = result.daily
  }

  async function fetchHistory() {
    const result = await useApiEndpoint('GET /api/v1/parse/history', { query: { page: 1, limit: 20 } })
    store.history = result.items
  }

  async function clearHistory() {
    await useApiEndpoint('DELETE /api/v1/parse/history')
    store.history = store.history.filter((item) => item.status === 'pending' || item.status === 'running')
  }

  async function deleteHistoryItem(jobId: string) {
    await useApiEndpoint('DELETE /api/v1/parse/history/:jobId', { params: { jobId } })
    store.history = store.history.filter((item) => item.jobId !== jobId)
  }

  async function fetchParseStatus() {
    return useApiEndpoint('GET /api/v1/parse/status')
  }

  async function fetchParseDialogs() {
    const result = await useApiEndpoint('GET /api/v1/parse/dialogs')
    store.setParseDialogs({
      dialogs: result.dialogs,
      truncated: result.truncated,
      total: result.total,
    })
  }

  return {
    fetchGlobal,
    fetchChats,
    fetchChat,
    deleteChat,
    fetchActivity,
    fetchHistory,
    clearHistory,
    deleteHistoryItem,
    fetchParseStatus,
    fetchParseDialogs,
  }
}
