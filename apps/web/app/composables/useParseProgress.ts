import type { ParseProgressDto, ParseProgressWsEvent, ParseStatusResponse } from '@tg-analyzer/shared'

const MAX_RETRIES = 5

export function useParseProgress() {
  const progress = useState<ParseProgressDto>('parse-progress', () => ({
    current: 0,
    total: 0,
    chatName: '',
    status: 'idle',
    message: '',
    scannedMessages: 0,
  }))
  const socketRef = useState<WebSocket | null>('parse-progress-socket', () => null)
  const retryCount = useState<number>('parse-progress-retry-count', () => 0)
  const retryTimeout = useState<number | null>('parse-progress-retry-timeout', () => null)
  const auth = useAuthStore()
  const config = useRuntimeConfig()

  function applyStatus(status: ParseStatusResponse) {
    progress.value = {
      current: status.progress.current ?? 0,
      total: status.progress.total ?? 0,
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

  function scheduleReconnect() {
    if (!import.meta.client || retryCount.value >= MAX_RETRIES || progress.value.status !== 'running' || !auth.accessToken) {
      return
    }

    const delay = Math.min(1000 * 2 ** retryCount.value, 30000)
    retryTimeout.value = window.setTimeout(() => {
      retryCount.value += 1
      connect()
    }, delay)
  }

  function connect() {
    if (!import.meta.client || !auth.accessToken || socketRef.value) {
      return
    }

    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }

    const socket = new WebSocket(`${config.public.wsUrl}/ws/parse-progress?token=${auth.accessToken}`)
    socketRef.value = socket

    socket.onopen = () => {
      retryCount.value = 0
      void fetchCurrentStatus()
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as ParseProgressWsEvent & Partial<ParseProgressDto>
      if (data.type === 'progress') {
        progress.value = {
          current: data.current,
          total: data.total,
          chatName: data.chatName ?? '',
          status: data.status ?? 'running',
          message: data.message ?? '',
          scannedMessages: data.scannedMessages ?? 0,
        }
      }
      if (data.type === 'completed') {
        progress.value = {
          ...progress.value,
          status: 'completed',
          message: data.message ?? 'Parse completed',
        }
        disconnect()
      }
      if (data.type === 'failed' || data.type === 'error') {
        progress.value = {
          ...progress.value,
          status: 'failed',
          message: 'message' in data ? data.message : progress.value.message,
        }
        disconnect()
      }
      if (data.type === 'cancelled') {
        progress.value = {
          ...progress.value,
          status: 'cancelled',
          message: data.message ?? 'Parse cancelled',
        }
        disconnect()
      }
    }

    socket.onerror = () => {
      socket.close()
    }

    socket.onclose = () => {
      socketRef.value = null
      scheduleReconnect()
    }
  }

  function disconnect() {
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }
    socketRef.value?.close()
    socketRef.value = null
  }

  function reset() {
    retryCount.value = 0
    progress.value = {
      current: 0,
      total: 0,
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
