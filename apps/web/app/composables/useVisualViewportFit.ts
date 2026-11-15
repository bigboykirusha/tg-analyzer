import type { Ref } from 'vue'

/** The keyboard counts as up when it takes more than this off the layout viewport (px): toolbars move it by less. */
const KEYBOARD_MIN = 120

/**
 * A fixed sheet is laid out against the layout viewport, which iOS Safari neither shrinks nor keeps in view when the
 * keyboard opens: it pans the visual viewport to show the field and the sheet's top (its search) goes off the screen.
 * While the keyboard is up this writes the visible band on the sheet's root — `--vv-top` and `--vv-bottom` (the
 * distance from the layout viewport's edges to it), `--vv-height` — so the sheet can sit inside it. Without a keyboard
 * nothing is written and the sheet is as it was. Read in base.css (`.sheet-layer`) and the chat sheet of home.
 */
export function useVisualViewportFit(root: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const names = ['--vv-top', '--vv-bottom', '--vv-height']
  let frame = 0

  function clear() {
    for (const name of names) root.value?.style.removeProperty(name)
  }
  function fit() {
    frame = 0
    const el = root.value
    const view = window.visualViewport
    if (!el || !view) return
    const layout = document.documentElement.clientHeight
    if (layout - view.height < KEYBOARD_MIN) return clear()
    el.style.setProperty('--vv-top', `${Math.max(0, view.offsetTop)}px`)
    el.style.setProperty('--vv-bottom', `${Math.max(0, layout - view.offsetTop - view.height)}px`)
    el.style.setProperty('--vv-height', `${view.height}px`)
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(fit)
  }
  function stop() {
    window.visualViewport?.removeEventListener('resize', schedule)
    window.visualViewport?.removeEventListener('scroll', schedule)
    cancelAnimationFrame(frame)
    frame = 0
    clear()
  }

  watch(
    [active, root],
    ([on, el], _before, onCleanup) => {
      if (!import.meta.client || !on || !el || !window.visualViewport) return
      window.visualViewport.addEventListener('resize', schedule)
      window.visualViewport.addEventListener('scroll', schedule)
      schedule()
      onCleanup(stop)
    },
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(stop)
}
