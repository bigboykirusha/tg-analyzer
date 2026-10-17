import type { ParseProgressDto } from '@tg-analyzer/shared'
import { api, ApiClientError } from './useApi'

const ACTIVE = new Set(['pending', 'running'])
const MAX_RECONNECT_DELAY_MS = 30_000
const STATUS_POLL_MS = 10_000

function idle(): ParseProgressDto {
  return {
    jobId: null,
    status: 'idle',
    phase: null,
    chatId: null,
    chatTitle: null,
    scannedMessages: 0,
    totalMessages: null,
    startedAt: null,
    waitSeconds: null,
    error: null,
  }
}

// Module-level so every component shares one socket.
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let reconnectAttempts = 0

/**
 * The single active analysis of the signed-in user. Progress arrives over a
 * WebSocket; a slow status poll covers dropped connections.
 */
export function useAnalysis() {
  const progress = useState<ParseProgressDto>('analysis-progress', idle)
  /** The last analysis that reached a final state; pages watch it to reload data. */
  const finished = useState<ParseProgressDto | null>('analysis-finished', () => null)
  const config = useRuntimeConfig()
  const isActive = computed(() => ACTIVE.has(progress.value.status))

  function apply(next: ParseProgressDto) {
    const wasActive = ACTIVE.has(progress.value.status)
    const isFinal = !ACTIVE.has(next.status) && next.status !== 'idle'
    if (isFinal || (wasActive && next.status === 'idle')) {
      finished.value = { ...progress.value, ...next }
    }
    progress.value = isFinal ? idle() : next
    if (ACTIVE.has(progress.value.status)) connect()
    else closeSocket()
  }

  async function refresh() {
    try {
      apply(await api('GET /api/v1/parse/status'))
    } catch {
      // Keep the last known state; the next poll or socket message will correct it.
    }
  }

  function socketUrl(ticket: string) {
    const base = config.public.wsUrl || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
    return `${base}/ws/parse-progress?ticket=${encodeURIComponent(ticket)}`
  }

  async function connect() {
    if (!import.meta.client || socket || reconnectTimer) return
    try {
      const { ticket } = await api('POST /api/v1/auth/ws-ticket')
      if (socket || !isActive.value) return
      socket = new WebSocket(socketUrl(ticket))
    } catch {
      scheduleReconnect()
      return
    }

    socket.onopen = () => {
      reconnectAttempts = 0
      void refresh()
    }
    socket.onmessage = (event) => {
      try {
        apply(JSON.parse(String(event.data)) as ParseProgressDto)
      } catch {
        // Ignore malformed frames.
      }
    }
    socket.onclose = () => {
      socket = null
      if (isActive.value) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (isActive.value) void connect()
    }, delay)
  }

  function closeSocket() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
    reconnectAttempts = 0
    const current = socket
    socket = null
    current?.close()
  }

  /** Called by the signed-in layout: load the current state and keep it fresh. */
  function start() {
    if (!import.meta.client || pollTimer) return
    void refresh()
    pollTimer = setInterval(() => {
      if (isActive.value) void refresh()
    }, STATUS_POLL_MS)
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    closeSocket()
    progress.value = idle()
    finished.value = null
  }

  async function startAnalysis(chatId: string, chatTitle: string | null) {
    await api('POST /api/v1/parse/start', { body: { chatId } })
    apply({ ...idle(), status: 'pending', phase: 'queued', chatId, chatTitle, startedAt: Date.now() })
    await refresh()
  }

  async function cancel() {
    try {
      await api('POST /api/v1/parse/cancel')
    } catch (error) {
      if (!(error instanceof ApiClientError && error.code === 'PARSE_NOT_ACTIVE')) throw error
    }
    await refresh()
  }

  return { progress, finished, isActive, start, stop, refresh, startAnalysis, cancel }
}
