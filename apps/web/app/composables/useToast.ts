export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastMessage {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  action?: ToastAction
}

export interface ToastInput extends Omit<ToastMessage, 'id'> {
  /** Milliseconds; 0 keeps the toast until it is closed. */
  duration?: number
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION_MS = 5000
const ACTION_DURATION_MS = 8000

interface Timer {
  handle: number | undefined
  remaining: number
  startedAt: number
}

// Timers live outside reactive state: they are client-only bookkeeping.
const timers = new Map<string, Timer>()

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Errors stay until closed; toasts with an action stay longer. */
function durationFor(input: ToastInput) {
  if (input.duration !== undefined) return input.duration
  if (input.variant === 'error') return 0
  return input.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS
}

export function useToast() {
  const toasts = useState<ToastMessage[]>('toast-messages', () => [])

  function remove(id: string) {
    const timer = timers.get(id)
    if (timer) window.clearTimeout(timer.handle)
    timers.delete(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function startTimer(id: string, ms: number) {
    timers.set(id, { handle: window.setTimeout(() => remove(id), ms), remaining: ms, startedAt: Date.now() })
  }

  /** Hover and focus pause the auto-hide timer. */
  function pause(id: string) {
    const timer = timers.get(id)
    if (!timer || timer.handle === undefined) return
    window.clearTimeout(timer.handle)
    timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt))
    timer.handle = undefined
  }

  function resume(id: string) {
    const timer = timers.get(id)
    if (!timer || timer.handle !== undefined) return
    startTimer(id, timer.remaining)
  }

  function push(input: ToastInput) {
    const toast: ToastMessage = {
      id: createToastId(),
      variant: input.variant,
      title: input.title,
      description: input.description,
      action: input.action,
    }
    const next = [...toasts.value, toast]
    for (const dropped of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) remove(dropped.id)
    toasts.value = [...toasts.value, toast]

    const ms = durationFor(input)
    if (import.meta.client && ms > 0) startTimer(toast.id, ms)
    return toast.id
  }

  return {
    toasts,
    remove,
    pause,
    resume,
    push,
    success: (title: string, description?: string, action?: ToastAction) =>
      push({ variant: 'success', title, description, action }),
    error: (title: string, description?: string, action?: ToastAction) =>
      push({ variant: 'error', title, description, action }),
    info: (title: string, description?: string, action?: ToastAction) =>
      push({ variant: 'info', title, description, action }),
    warning: (title: string, description?: string, action?: ToastAction) =>
      push({ variant: 'warning', title, description, action }),
  }
}
