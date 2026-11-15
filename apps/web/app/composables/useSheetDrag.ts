import type { Ref } from 'vue'

/** A flick faster than this closes the sheet however short it was (px per ms). */
const FLICK_VELOCITY = 0.11
/** Dragged further than this share of its height, the sheet closes on release. */
const CLOSE_SHARE = 0.3
/** A touch this close to the left edge belongs to the browser's back swipe. */
const EDGE = 20
/** How long the layer stays promoted after a release, while the sheet settles. */
const SETTLE_MS = 520

/**
 * Drag-to-dismiss for every sheet on a phone (`UiBottomSheet`, and `UiModalDialog` below 640px). One mechanic, the
 * one the chat sheet of home uses: the panel is a box that never changes size and only moves, by
 * `translate3d(0, var(--sheet-drag), 0)`. A finger writes `--sheet-drag` straight on the panel once a frame (no
 * re-render per pointer move); the panel's own `transition: transform` carries it from there.
 *
 * - A new touch picks the sheet up from where it is on screen right now, in flight or not.
 * - The transition is switched off inline, synchronously, for the length of a drag, and back on at release in the same
 *   task, so there is no frame at the wrong place.
 * - Let go past the threshold, the offset stays and the leave transition carries on down from there; otherwise the
 *   offset goes back to 0 and the base transition springs the sheet home. `close` returns false when the sheet can't
 *   close right now (busy): it then settles back.
 * - The layer is promoted (`will-change`) only for the drag and the settling after it.
 * - A touch that starts within 20px of the left edge is Safari's back swipe and is left alone.
 *
 * Bind `handlers` to the grabber area; the panel's CSS reads `--sheet-drag`.
 */
export function useSheetDrag(panel: Ref<HTMLElement | null>, close: () => boolean) {
  const dragging = ref(false)
  let start: number | null = null
  let origin = 0
  let offset = 0
  let frame = 0
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let trail: { y: number; t: number }[] = []

  function write(y: number) {
    panel.value?.style.setProperty('--sheet-drag', `${y}px`)
  }
  /** Where the panel is on screen now, even in the middle of a transition. */
  function currentY() {
    if (!panel.value) return 0
    return new DOMMatrixReadOnly(getComputedStyle(panel.value).transform).m42
  }
  /** Past the top it gives a little, like rubber. */
  function rubber(raw: number) {
    return raw >= 0 ? raw : -Math.sqrt(-raw) * 2
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Buttons in the sheet's header (close, back) keep their own press: a drag starts elsewhere.
    if ((event.target as Element | null)?.closest('button, a, input, [role="button"]')) return
    if (event.clientX < EDGE) return
    const el = panel.value
    if (!el) return
    clearTimeout(settleTimer)
    // Picked up from wherever it is: its place is written as the transition goes off, in the same task.
    origin = Math.max(0, currentY())
    offset = origin
    el.style.transition = 'none'
    el.style.willChange = 'transform'
    write(origin)
    start = event.clientY
    trail = [{ y: event.clientY, t: event.timeStamp }]
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (start === null) return
    offset = rubber(origin + event.clientY - start)
    trail = [...trail.filter((point) => event.timeStamp - point.t < 100), { y: event.clientY, t: event.timeStamp }]
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0
        if (start !== null) write(offset)
      })
    }
  }

  function onPointerUp() {
    if (start === null) return
    start = null
    cancelAnimationFrame(frame)
    frame = 0
    const el = panel.value
    const height = el?.offsetHeight ?? 0
    const first = trail[0]
    const last = trail.at(-1)
    const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
    const closing = offset > 0 && (velocity > FLICK_VELOCITY || (height > 0 && offset > height * CLOSE_SHARE))
    dragging.value = false
    // The finger's last place is written once more, then the transition is given back to the classes.
    write(offset)
    if (el) el.style.transition = ''
    if (closing && close()) {
      // The offset stays: the leave transition starts from here and carries on down.
      return
    }
    write(0)
    settleTimer = setTimeout(() => {
      if (panel.value) panel.value.style.willChange = ''
    }, SETTLE_MS)
  }

  const handlers = {
    pointerdown: onPointerDown,
    pointermove: onPointerMove,
    pointerup: onPointerUp,
    pointercancel: onPointerUp,
  }
  /** A sheet that opens again starts in place. */
  function reset() {
    cancelAnimationFrame(frame)
    frame = 0
    clearTimeout(settleTimer)
    start = null
    dragging.value = false
    const el = panel.value
    if (el) {
      el.style.removeProperty('--sheet-drag')
      el.style.transition = ''
      el.style.willChange = ''
    }
  }
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    clearTimeout(settleTimer)
  })
  return { dragging, handlers, reset }
}
