import type { Ref } from 'vue'
import { tokenMs } from '../lib/sheetMotion'

/** Moved less than this, it was a tap and nothing is touched. */
const SLOP = 6
/** Let go further than this from where the drag began, the sheet goes on to the other end. */
const TRAVEL = 64
/** A flick faster than this goes on however short (px per ms). */
const FLICK = 0.3
/** A touch this close to the left edge belongs to the browser's back swipe. */
const EDGE = 20
/** How long the finger's last stretch counts for the flick, ms. */
const TRAIL_MS = 100
/** A transition that never reports its end still lets the layer go this long after its duration, ms. */
const SETTLE_SLACK = 100

interface SheetDragOptions {
  /** Release: `true` when the sheet goes to its rest (closes). Return false when it can't (busy): it settles back. */
  onRelease: (toRest: boolean) => boolean | void
  /** The element that carries the sheet's variables and `data-sheet` (its scrim and edge read them); default the panel. */
  root?: Ref<HTMLElement | null>
  /** A sheet that rests on screen (the chat sheet) gives the distance between open and rest; one that only closes omits it. */
  span?: () => number
  /** Resting sheets: is it open now (else at rest). */
  isOpen?: () => boolean
  /** The variables to write for a place (the chat sheet adds its scrim's and veil's numbers). */
  vars?: (y: number) => Record<string, string>
  /** A press that keeps its own behaviour (buttons, a field); default buttons, links and inputs. */
  ignore?: (event: PointerEvent) => boolean
}

/**
 * The one drag for every phone sheet (`UiBottomSheet`, `UiModalDialog` below 640px, the chat sheet of home). The panel
 * is a box that never changes size and only moves, by `translate3d(0, var(--sheet-y), 0)` (base.css `.sheet-surface`).
 * A finger writes `--sheet-y` once a frame (no re-render per move). `data-sheet` on the root says `drag` (every
 * transition off) or `settle` (the layer is promoted until the panel's transform transition ends).
 *
 * - Nothing is touched until the finger passes the slop; then the sheet is picked up from where it is on screen
 *   right now, in flight or not.
 * - Let go past the distance or the flick, it goes to its rest (a sheet that only closes: the offset stays and the
 *   leave transition carries on from there); otherwise it springs back.
 * - A touch within 20px of the left edge is Safari's back swipe and is left alone.
 *
 * Bind `handlers` to the grabber area.
 */
export function useSheetDrag(panel: Ref<HTMLElement | null>, options: SheetDragOptions) {
  const root = options.root ?? panel
  const resting = options.span !== undefined
  const vars = options.vars ?? ((y: number) => ({ '--sheet-y': `${y}px` }))
  const written = new Set<string>()
  let touching = false
  let dragging = false
  let moved = false
  let startY = 0
  let origin = 0
  let offset = 0
  let frame = 0
  let clearFrame = 0
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let stopListening: (() => void) | undefined
  let trail: { y: number; t: number }[] = []

  function write(y: number) {
    for (const [name, value] of Object.entries(vars(y))) {
      root.value?.style.setProperty(name, value)
      written.add(name)
    }
  }
  function clearVars() {
    for (const name of written) root.value?.style.removeProperty(name)
    written.clear()
  }
  function setState(state: 'drag' | 'settle' | null) {
    const el = root.value
    if (!el) return
    if (state) el.dataset.sheet = state
    else delete el.dataset.sheet
  }
  function endSettle() {
    clearTimeout(settleTimer)
    stopListening?.()
    stopListening = undefined
  }
  /** Until the panel has landed its layer is promoted; then it is given back. */
  function settle() {
    endSettle()
    setState('settle')
    const el = panel.value
    const done = () => {
      endSettle()
      setState(null)
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === el && event.propertyName === 'transform') done()
    }
    el?.addEventListener('transitionend', onEnd)
    stopListening = () => el?.removeEventListener('transitionend', onEnd)
    settleTimer = setTimeout(done, tokenMs('--duration-sheet') + SETTLE_SLACK)
  }

  /** Where the panel is on screen now, even in the middle of a transition. */
  function currentY() {
    return panel.value ? new DOMMatrixReadOnly(getComputedStyle(panel.value).transform).m42 : 0
  }
  /** Past an end it gives a little, like rubber. */
  function rubber(raw: number) {
    const far = options.span?.() ?? Infinity
    if (raw < 0) return -Math.sqrt(-raw) * 2
    return raw > far ? far + Math.sqrt(raw - far) * 2 : raw
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const keeps =
      options.ignore ??
      ((e: PointerEvent) => !!(e.target as Element | null)?.closest('button, a, input, [role="button"]'))
    if (keeps(event) || event.clientX < EDGE) return
    // A release a moment ago has not handed the sheet back to its classes yet: now, so it cannot do it mid-drag.
    cancelAnimationFrame(clearFrame)
    if (!dragging) clearVars()
    touching = true
    moved = false
    startY = event.clientY
    trail = [{ y: event.clientY, t: event.timeStamp }]
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!touching) return
    if (!dragging) {
      if (Math.abs(event.clientY - startY) < SLOP) return
      // The slop is spent: only now is the sheet picked up, from its place on screen, its transitions switched off.
      origin = resting ? currentY() : Math.max(0, currentY())
      startY = event.clientY
      trail = []
      endSettle()
      setState('drag')
      write(origin)
      dragging = true
      moved = true
    }
    offset = rubber(origin + event.clientY - startY)
    trail = [...trail.filter((point) => event.timeStamp - point.t < TRAIL_MS), { y: event.clientY, t: event.timeStamp }]
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0
        if (dragging) write(offset)
      })
    }
  }

  function onPointerUp() {
    if (!touching) return
    touching = false
    cancelAnimationFrame(frame)
    frame = 0
    if (!dragging) return
    dragging = false
    const first = trail[0]
    const last = trail.at(-1)
    const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
    const delta = offset - origin
    const open = options.isOpen?.() ?? true
    const toRest = open ? delta > TRAVEL || velocity > FLICK : !(delta < -TRAVEL || velocity < -FLICK)
    // The finger's last place is written once more, then the transitions are given back to the classes.
    write(offset)
    settle()
    const accepted = options.onRelease(toRest) !== false
    if (resting) clearFrame = requestAnimationFrame(clearVars)
    else if (!(toRest && accepted)) write(0)
    // A sheet that closes keeps the offset: the leave transition starts from here and carries on down.
  }

  /** The end of a drag is not a tap: true once after one. */
  function wasDrag() {
    const value = moved
    moved = false
    return value
  }
  /** A sheet that opens again starts in place. */
  function reset() {
    cancelAnimationFrame(frame)
    cancelAnimationFrame(clearFrame)
    frame = clearFrame = 0
    endSettle()
    touching = dragging = false
    clearVars()
    setState(null)
  }
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    cancelAnimationFrame(clearFrame)
    endSettle()
  })

  const handlers = {
    pointerdown: onPointerDown,
    pointermove: onPointerMove,
    pointerup: onPointerUp,
    pointercancel: onPointerUp,
  }
  return { handlers, reset, settle, wasDrag }
}
