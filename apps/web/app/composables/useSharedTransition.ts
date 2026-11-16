import type { Router } from 'vue-router'

type Named = readonly [Element | null | undefined, string]

/** The one shared thing of a report: the pulse of its tile on home and of its poster (and the capsule that becomes a tile). */
export const SHARED_PULSE = 'report-pulse'
export const SHARED_PLATE = 'report-plate'

let busy = false

/**
 * Two moments of a report fly one element across the screen with a View Transition (the capsule of a running
 * analysis becomes its tile, a tile's pulse becomes the poster's and back). Nothing else in the app is a
 * transition: where the browser has no `startViewTransition`, or the person asks for less motion, `run` just does
 * the update — the plain navigation, no animation, no second code path.
 *
 * Rules the browser sets, kept here so a caller cannot break them:
 * - a name is unique while a transition is captured, so a name goes on the element being flown only, just before the
 *   transition starts, and comes off when it has finished (or fails);
 * - the old picture is taken when `startViewTransition` is called, the new one after the update callback: the
 *   callback must be quick (the page does not paint while it runs), so data is fetched BEFORE `run`;
 * - the system's own back swipe is not wrapped — only calls made from our own clicks.
 */
export function useSharedTransition() {
  function supported() {
    if (!import.meta.client || typeof document.startViewTransition !== 'function') return false
    if (document.hidden) return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function name(element: Element | null | undefined, value: string) {
    const target = element as HTMLElement | null | undefined
    if (target) target.style.setProperty('view-transition-name', value)
  }

  /**
   * `old` — what is on the screen now and flies (named at once); `update` — change the state (navigate, apply the
   * fetched data); `next` — what answers it in the new state (found after the update has rendered).
   */
  async function run(old: Named[], update: () => void | Promise<void>, next: () => Named[]) {
    const from = old.filter(([element]) => element)
    if (!supported() || busy || !from.length) {
      await update()
      return
    }
    busy = true
    const named: Element[] = []
    let failure: unknown
    from.forEach(([element, value]) => {
      name(element, value)
      named.push(element!)
    })
    const clear = () =>
      named.forEach((element) => (element as HTMLElement).style.removeProperty('view-transition-name'))
    try {
      const transition = document.startViewTransition(async () => {
        try {
          // The old names come off before the new ones go on: one element per name at the capture.
          clear()
          await update()
          await nextTick()
          next().forEach(([element, value]) => {
            if (!element) return
            name(element, value)
            named.push(element)
          })
        } catch (error) {
          failure = error
        }
      })
      await transition.finished.catch(() => undefined)
    } finally {
      clear()
      busy = false
    }
    if (failure) throw failure
  }

  /** The pulse of a report's tile on home (a card of the list, compact or whole). */
  function tilePulse(chatId: string) {
    return document.querySelector(`[data-report-tile="${CSS.escape(chatId)}"] .pulse`)
  }

  /** The pulse on an open report's poster. */
  function posterPulse() {
    return document.querySelector('[data-poster] .poster__pulse .pulse')
  }

  /** «Назад» from a report to home, by our own button: the poster's pulse flies back into its tile. True when it took over. */
  function backFromReport(router: Router, event: MouseEvent) {
    const route = router.currentRoute.value
    const chatId = route.name === 'chat-id' ? String(route.params.id) : ''
    const from = chatId ? posterPulse() : null
    if (!from || !supported()) return false
    event.preventDefault()
    void run(
      [[from, SHARED_PULSE]],
      async () => {
        const settled = new Promise<void>((resolve) => {
          const stop = router.afterEach(() => {
            stop()
            resolve()
          })
          setTimeout(() => {
            stop()
            resolve()
          }, 1500)
        })
        router.back()
        await settled
      },
      () => [[tilePulse(chatId), SHARED_PULSE]],
    )
    return true
  }

  return { supported, run, tilePulse, posterPulse, backFromReport }
}
