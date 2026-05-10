export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

const DEFAULT_TIMEOUT_MS = 4200

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useToast() {
  const toasts = useState<ToastMessage[]>('toast-messages', () => [])

  function remove(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(input: Omit<ToastMessage, 'id'>, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const toast: ToastMessage = {
      ...input,
      id: createToastId(),
    }

    toasts.value = [...toasts.value, toast].slice(-4)

    if (import.meta.client && timeoutMs > 0) {
      window.setTimeout(() => remove(toast.id), timeoutMs)
    }

    return toast.id
  }

  return {
    toasts,
    remove,
    success: (title: string, description?: string) => show({ variant: 'success', title, description }),
    error: (title: string, description?: string) => show({ variant: 'error', title, description }, 6500),
    info: (title: string, description?: string) => show({ variant: 'info', title, description }),
    warning: (title: string, description?: string) => show({ variant: 'warning', title, description }, 5600),
  }
}
