import type { ParseProgressDto, ParseProgressWsEvent, ParseStatusResponse } from '@tg-analyzer/shared'
import { refreshAccessToken } from './useApi'
import { isTokenExpiringSoon, isTokenUsable } from '../utils/auth'

const MAX_RETRIES = 5

export function useParseProgress() {
  const progress = useState<ParseProgressDto>('parse-progress', () => ({
    current: 0,
    total: 0,
    chatId: null,
    chatName: '',
    status: 'idle',
    message: '',
    scannedMessages: 0,
  }))
  const socketRef = useState<WebSocket | null>('parse-progress-socket', () => null)
  const retryCount = useState<number>('parse-progress-retry-count', () => 0)
  const retryTimeout = useState<number | null>('parse-progress-retry-timeout', () => null)
  const intentionalClose = useState<boolean>('parse-progress-intentional-close', () => false)
  const forceRefresh = useState<boolean>('parse-progress-force-refresh', () => false)
  const auth = useAuthStore()
  const config = useRuntimeConfig()

  function applyStatus(status: ParseStatusResponse) {
    progress.value = {
      current: status.progress.current ?? 0,
      total: status.progress.total ?? 0,
      chatId: status.progress.chatId ?? null,
      chatName: status.progress.chatName ?? '',
      status: status.progress.status ?? status.status,
      message: status.progress.message ?? '',
      scannedMessages: status.progress.scannedMessages ?? 0,
    }
  }

  async function fetchCurrentStatus() {
    try {
      const status = await useApiFetch<ParseStatusResponse>('/api/parse/status')
      applyStatus(status)
    } catch {
      // Keep the last known progress if status refresh fails.
    }
  }

  async function ensureSocketAccessToken() {
    if (!auth.isAuthorized || !auth.accessToken) {
      return false
    }

    if (!forceRefresh.value && !isTokenExpiringSoon(auth.accessToken, 30 * 1000)) {
      return true
    }

    const refreshResult = await refreshAccessToken(config.public.apiUrl)
    if (refreshResult.accessToken) {
      forceRefresh.value = false
      return true
    }

    return Boolean(auth.accessToken && isTokenUsable(auth.accessToken))
  }

  function scheduleReconnect() {
    const reconnectable = progress.value.status === 'running' || progress.value.status === 'pending'
    if (!import.meta.client || retryCount.value >= MAX_RETRIES || !reconnectable || !auth.isAuthorized) {
      return
    }

    const delay = Math.min(1000 * 2 ** retryCount.value, 30000)
    retryTimeout.value = window.setTimeout(() => {
      retryCount.value += 1
      void connect()
    }, delay)
  }

  async function connect() {
    if (!import.meta.client || socketRef.value || !auth.isAuthorized) {
      return
    }

    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }

    const hasAccessToken = await ensureSocketAccessToken()
    if (!hasAccessToken || !auth.accessToken) {
      return
    }

    const socket = new WebSocket(`${config.public.wsUrl}/ws/parse-progress?token=${auth.accessToken}`)
    socketRef.value = socket
    intentionalClose.value = false

    socket.onopen = () => {
      retryCount.value = 0
      forceRefresh.value = false
      void fetchCurrentStatus()
    }

    socket.onmessage = (event) => {
      let data: ParseProgressWsEvent & Partial<ParseProgressDto>
      try {
        data = JSON.parse(event.data) as ParseProgressWsEvent & Partial<ParseProgressDto>
      } catch {
        return
      }
      if (data.type === 'progress') {
        progress.value = {
          current: data.current,
          total: data.total,
          chatId: data.chatId ?? null,
          chatName: data.chatName ?? '',
          status: data.status ?? 'running',
          message: data.message ?? '',
          scannedMessages: data.scannedMessages ?? 0,
        }
      }
      if (data.type === 'completed') {
        progress.value = {
          ...progress.value,
          chatId: data.chatId ?? progress.value.chatId ?? null,
          status: 'completed',
          message: data.message ?? 'Parse completed',
        }
        void fetchCurrentStatus()
        disconnect()
      }
      if (data.type === 'failed' || data.type === 'error') {
        progress.value = {
          ...progress.value,
          chatId: 'chatId' in data ? (data.chatId ?? progress.value.chatId ?? null) : progress.value.chatId,
          status: 'failed',
          message: 'message' in data ? data.message : progress.value.message,
        }
        void fetchCurrentStatus()
        disconnect()
      }
      if (data.type === 'cancelled') {
        progress.value = {
          ...progress.value,
          chatId: data.chatId ?? progress.value.chatId ?? null,
          status: 'cancelled',
          message: data.message ?? 'Parse cancelled',
        }
        void fetchCurrentStatus()
        disconnect()
      }
    }

    socket.onerror = () => {
      socket.close()
    }

    socket.onclose = (event) => {
      socketRef.value = null
      if (event.code === 1008) {
        forceRefresh.value = true
      }
      if (intentionalClose.value) {
        intentionalClose.value = false
        return
      }
      scheduleReconnect()
    }
  }

  function disconnect() {
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }
    intentionalClose.value = true
    socketRef.value?.close()
    socketRef.value = null
  }

  function reset() {
    retryCount.value = 0
    forceRefresh.value = false
    progress.value = {
      current: 0,
      total: 0,
      chatId: null,
      chatName: '',
      status: 'idle',
      message: '',
      scannedMessages: 0,
    }
  }

  return {
    progress,
    applyStatus,
    connect,
    disconnect,
    reset,
    fetchCurrentStatus,
  }
}
