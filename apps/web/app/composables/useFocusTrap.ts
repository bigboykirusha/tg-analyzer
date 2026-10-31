import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal focus handling shared by dialogs and sheets: focus moves inside on
 * open (to `initial` or the first focusable), Tab cycles within the panel,
 * Esc calls `onEscape`, and focus returns to the trigger on close.
 */
export function useFocusTrap(
  panel: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  options: { onEscape: () => void; initial?: () => HTMLElement | null | undefined },
) {
  let previouslyFocused: HTMLElement | null = null

  function handleKeydown(event: KeyboardEvent) {
    if (!open.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      options.onEscape()
      return
    }
    if (event.key !== 'Tab' || !panel.value) return
    const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) return
    // The panel (or a non-focusable child) can hold focus after opening: Shift+Tab from there wraps too.
    const index = focusable.indexOf(document.activeElement as HTMLElement)
    if (event.shiftKey && index <= 0) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && index === focusable.length - 1) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    open,
    async (value) => {
      if (!import.meta.client) return
      if (value) {
        previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
        document.addEventListener('keydown', handleKeydown)
        await nextTick()
        const target = options.initial?.() ?? panel.value?.querySelector<HTMLElement>(FOCUSABLE)
        target?.focus()
      } else {
        document.removeEventListener('keydown', handleKeydown)
        previouslyFocused?.focus()
        previouslyFocused = null
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (import.meta.client) document.removeEventListener('keydown', handleKeydown)
  })
}
