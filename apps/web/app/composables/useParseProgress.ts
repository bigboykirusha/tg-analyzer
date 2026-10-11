import { applyParseProgressEvent } from '@tg-analyzer/shared'
import type { ParseProgressDto, ParseProgressWsEvent, ParseStatusResponse } from '@tg-analyzer/shared'
import { refreshAccessToken, useApiEndpoint } from './useApi'
import { isTokenExpiringSoon, isTokenUsable } from '../utils/auth'

const MAX_RETRIES = 5
let statusRequestPromise: Promise<ParseStatusResponse | null> | null = null

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
  const bootstrapped = useState<boolean>('parse-progress-bootstrapped', () => false)
  const connecting = useState<boolean>('parse-progress-connecting', () => false)
  const auth = useAuthStore()
  const config = useRuntimeConfig()

  function applyStatus(status: ParseStatusResponse) {
    if (status.status === 'idle' || status.progress.status === 'idle' || !status.jobId) {
      reset()
      bootstrapped.value = true
      return
    }

    progress.value = {
      current: status.progress.current ?? 0,
      total: status.progress.total ?? 0,
      chatId: status.progress.chatId ?? null,
      chatName: status.progress.chatName ?? '',
      status: status.progress.status ?? status.status,
      message: status.progress.message ?? '',
      scannedMessages: status.progress.scannedMessages ?? 0,
      startTime: status.progress.startTime,
      phase: status.progress.phase,
    }
    bootstrapped.value = true
  }

  async function fetchCurrentStatus() {
    if (statusRequestPromise) {
      return statusRequestPromise
    }

    statusRequestPromise = (async () => {
      try {
        const status = await useApiEndpoint('GET /api/v1/parse/status')
        applyStatus(status)
        return status
      } catch {
        // Keep the last known progress if status refresh fails.
        return null
      } finally {
        statusRequestPromise = null
      }
    })()

    return statusRequestPromise
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

  async function getWebSocketTicket() {
    return useApiEndpoint('POST /api/v1/auth/ws-ticket')
  }

  function scheduleReconnect() {
    const reconnectable = progress.value.status === 'running' || progress.value.status === 'pending'
    if (
      !import.meta.client ||
      retryCount.value >= MAX_RETRIES ||
      !reconnectable ||
      !auth.isAuthorized ||
      !bootstrapped.value
    ) {
      return
    }

    const delay = Math.min(1000 * 2 ** retryCount.value, 30000)
    retryTimeout.value = window.setTimeout(() => {
      retryCount.value += 1
      void connect()
    }, delay)
  }

  function resolveWebSocketUrl(pathWithQuery: string) {
    const explicit = config.public.wsUrl
    if (explicit) {
      return `${explicit}${pathWithQuery}`
    }
    const directBase = config.public.wsDirectFallbackUrl
    if (directBase) {
      return `${directBase}${pathWithQuery}`
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${pathWithQuery}`
  }

  async function connect() {
    if (!import.meta.client || socketRef.value || connecting.value || !auth.isAuthorized || !bootstrapped.value) {
      return
    }

    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value)
      retryTimeout.value = null
    }

    connecting.value = true
    const shouldResyncFromServer = retryCount.value > 0
    let socket: WebSocket
    try {
      const hasAccessToken = await ensureSocketAccessToken()
      if (!hasAccessToken || !auth.accessToken) {
        return
      }

      const { ticket } = await getWebSocketTicket()
      socket = new WebSocket(resolveWebSocketUrl(`/ws/parse-progress?ticket=${ticket}`))
    } catch {
      scheduleReconnect()
      return
    } finally {
      connecting.value = false
    }

    socketRef.value = socket
    intentionalClose.value = false

    socket.onopen = () => {
      retryCount.value = 0
      forceRefresh.value = false
      if (shouldResyncFromServer) {
        void fetchCurrentStatus()
      }
    }

    socket.onmessage = (event) => {
      let data: ParseProgressWsEvent & Partial<ParseProgressDto>
      try {
        data = JSON.parse(event.data) as ParseProgressWsEvent & Partial<ParseProgressDto>
      } catch {
        return
      }
      progress.value = applyParseProgressEvent(progress.value, data)
      if (data.type === 'completed' || data.type === 'failed' || data.type === 'error' || data.type === 'cancelled') {
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
    connecting.value = false
    socketRef.value?.close()
    socketRef.value = null
  }

  function reset() {
    retryCount.value = 0
    forceRefresh.value = false
    connecting.value = false
    progress.value = {
      current: 0,
      total: 0,
      chatId: null,
      chatName: '',
      status: 'idle',
      message: '',
      scannedMessages: 0,
      phase: undefined,
    }
  }

  async function bootstrapFromServer() {
    const status = await fetchCurrentStatus()
    bootstrapped.value = true
    if (progress.value.status === 'pending' || progress.value.status === 'running') void connect()
    return status
  }

  function clearBootstrap() {
    bootstrapped.value = false
  }

  return {
    progress,
    bootstrapped,
    applyStatus,
    bootstrapFromServer,
    clearBootstrap,
    connect,
    disconnect,
    reset,
    fetchCurrentStatus,
  }
}
