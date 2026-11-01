import type { ParseProgressDto, QueuedAnalysisDto } from '@tg-analyzer/shared'
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
let generation = 0
let visibilityListener: (() => void) | null = null

/**
 * The single active analysis of the signed-in user. Progress arrives over a
 * WebSocket; a slow status poll covers dropped connections.
 */
export function useAnalysis() {
  const progress = useState<ParseProgressDto>('analysis-progress', idle)
  /** The last analysis that reached a final state; pages watch it to reload data. */
  const finished = useState<ParseProgressDto | null>('analysis-finished', () => null)
  /** Chats waiting after the running one, oldest first. */
  const queued = useState<QueuedAnalysisDto[]>('analysis-queued', () => [])
  const config = useRuntimeConfig()
  const isActive = computed(() => ACTIVE.has(progress.value.status))

  function apply(next: ParseProgressDto) {
    const isFinal = !ACTIVE.has(next.status) && next.status !== 'idle'
    if (isFinal && next.jobId !== finished.value?.jobId) {
      finished.value = next
    }
    progress.value = isFinal ? idle() : next
    if (next.queued) queued.value = next.queued
    else if (next.status === 'idle') queued.value = []
    if (ACTIVE.has(progress.value.status)) connect()
    else closeSocket()
    // When one analysis ends the next queued one starts; fetch it from the status endpoint.
    if (isFinal && queued.value.length) void refresh()
  }

  async function refresh() {
    const currentGeneration = generation
    const jobId = progress.value.jobId
    try {
      const next = await api('GET /api/v1/parse/status', { query: jobId ? { jobId } : {} })
      if (generation === currentGeneration && progress.value.jobId === jobId) apply(next)
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
    const currentGeneration = generation
    try {
      const { ticket } = await api('POST /api/v1/auth/ws-ticket')
      if (generation !== currentGeneration || socket || !isActive.value) return
      socket = new WebSocket(socketUrl(ticket))
    } catch {
      if (generation === currentGeneration && isActive.value) scheduleReconnect()
      return
    }

    const current = socket
    socket.onopen = () => {
      if (socket !== current) return
      reconnectAttempts = 0
      void refresh()
    }
    socket.onmessage = (event) => {
      if (socket !== current) return
      try {
        apply(JSON.parse(String(event.data)) as ParseProgressDto)
      } catch {
        // Ignore malformed frames.
      }
    }
    socket.onclose = () => {
      if (socket !== current) return
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
    if (current) current.onclose = null
    current?.close()
  }

  /** Called by the signed-in layout: load the current state and keep it fresh. */
  function start() {
    if (!import.meta.client || pollTimer) return
    void refresh()
    pollTimer = setInterval(() => void refresh(), STATUS_POLL_MS)
    visibilityListener = onVisibilityChange
    document.addEventListener('visibilitychange', visibilityListener)
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void refresh()
  }

  function stop() {
    generation += 1
    if (import.meta.client && visibilityListener) document.removeEventListener('visibilitychange', visibilityListener)
    visibilityListener = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
    closeSocket()
    progress.value = idle()
    finished.value = null
    queued.value = []
  }

  async function startAnalysis(chatId: string, chatTitle: string | null) {
    const currentGeneration = generation
    let jobId: string
    try {
      const result = await api('POST /api/v1/parse/start', { body: { chatId } })
      jobId = result.jobId
    } catch (error) {
      if (generation !== currentGeneration) return
      throw error
    }
    if (generation !== currentGeneration) return
    // With an analysis already running, the new one only joins the queue.
    if (isActive.value) queued.value = [...queued.value, { jobId, chatId, chatTitle }]
    else apply({ ...idle(), jobId, status: 'pending', phase: 'queued', chatId, chatTitle, startedAt: Date.now() })
    await refresh()
  }

  /** Cancels a queued job, or the running one when `jobId` is omitted. */
  async function cancel(jobId?: string) {
    try {
      await api('POST /api/v1/parse/cancel', { body: jobId ? { jobId } : {} })
    } catch (error) {
      if (!(error instanceof ApiClientError && error.code === 'PARSE_NOT_ACTIVE')) throw error
    }
    await refresh()
  }

  return { progress, finished, queued, isActive, start, stop, refresh, startAnalysis, cancel }
}
