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
  /** News about a person: the banner takes their colour and avatar (ToastProvider). */
  chatId?: string
  /** The name the avatar's initials come from, when the title is not the name. */
  avatarTitle?: string
}

export interface ToastInput extends Omit<ToastMessage, 'id'> {
  /** Milliseconds; 0 keeps the toast until it is closed. */
  duration?: number
}

/**
 * One banner at a time, as on iPhone (18.11): a new one takes the old one's place instead of stacking under it,
 * so the banners never cover the header's buttons. An error or a banner with an action is not pushed out by
 * anything milder: the newcomer waits until it is read or put away.
 */
const DEFAULT_DURATION_MS = 5000
const ACTION_DURATION_MS = 8000
/** An error waits longer to be read; a tap or a flick up puts it away sooner (there is no close button). */
const ERROR_DURATION_MS = 10000

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

/** Errors and toasts with an action stay longer. */
function durationFor(input: ToastInput) {
  if (input.duration !== undefined) return input.duration
  if (input.variant === 'error') return ERROR_DURATION_MS
  return input.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS
}

export function useToast() {
  const toasts = useState<ToastMessage[]>('toast-messages', () => [])

  /** What waits behind an error or an action banner, oldest first. */
  const waiting = useState<{ toast: ToastMessage; ms: number }[]>('toast-waiting', () => [])

  function drop(id: string) {
    const timer = timers.get(id)
    if (timer) window.clearTimeout(timer.handle)
    timers.delete(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(toast: ToastMessage, ms: number) {
    for (const shown of toasts.value) drop(shown.id)
    toasts.value = [toast]
    if (import.meta.client && ms > 0) startTimer(toast.id, ms)
  }

  function remove(id: string) {
    waiting.value = waiting.value.filter((item) => item.toast.id !== id)
    drop(id)
    const next = toasts.value.length ? undefined : waiting.value[0]
    if (next) {
      waiting.value = waiting.value.slice(1)
      show(next.toast, next.ms)
    }
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
      chatId: input.chatId,
      avatarTitle: input.avatarTitle,
    }
    const ms = durationFor(input)
    const current = toasts.value[0]
    const keeps = current && (current.variant === 'error' || current.action) && toast.variant !== 'error'
    if (keeps) waiting.value = [...waiting.value, { toast, ms }]
    else show(toast, ms)
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
