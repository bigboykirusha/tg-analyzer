/** A move longer than this is a swipe, shorter is a tap. */
const SWIPE_PX = 40
/** Held longer than this, a press was reading, not tapping: release resumes and never pages. */
const HOLD_MS = 250
/** A downward flick faster than this closes however short it was (px per ms). */
const FLICK_VELOCITY = 0.4

/**
 * How «Итоги» answer the hand — touch on phones, the mouse elsewhere: a tap pages (the left third goes
 * back), a hold pauses to read, a horizontal swipe pages, and a drag down follows the finger and closes
 * the story, by distance or by a flick.
 */
export function useStoryGestures(options: { go: (step: 1 | -1) => void; close: () => void }) {
  /** True while a finger is down: the frame's timer waits. */
  const pressed = ref(false)
  /** Held long enough to be reading: the controls step aside. */
  const holding = ref(false)
  /** How far the frame follows the finger down; null when nothing is dragging it. */
  const dragY = ref<number | null>(null)
  const frameStyle = computed(() =>
    dragY.value === null
      ? undefined
      : {
          transform: `translateY(${dragY.value}px) scale(${1 - Math.min(dragY.value, 400) / 2400})`,
          transition: 'none',
        },
  )

  let start: { x: number; y: number; at: number } | null = null
  let trail: { y: number; t: number }[] = []
  let holdTimer: ReturnType<typeof setTimeout> | undefined

  function begin(x: number, y: number, at: number) {
    start = { x, y, at }
    trail = [{ y, t: at }]
    pressed.value = true
    clearTimeout(holdTimer)
    holdTimer = setTimeout(() => (holding.value = true), HOLD_MS)
  }

  function move(x: number, y: number, at: number) {
    if (!start) return
    const dx = x - start.x
    const dy = y - start.y
    trail = [...trail.filter((point) => at - point.t < 100), { y, t: at }]
    if (dragY.value !== null || (dy > 10 && dy > Math.abs(dx))) {
      clearTimeout(holdTimer)
      holding.value = false
      // Down follows the finger; up resists, since there is nowhere to go.
      dragY.value = dy >= 0 ? dy : -Math.sqrt(-dy) * 2
    }
  }

  function settle() {
    clearTimeout(holdTimer)
    holding.value = false
    pressed.value = false
    dragY.value = null
  }

  function end(x: number, y: number, at: number, stage: HTMLElement) {
    if (!start) return settle()
    const dx = x - start.x
    const dy = y - start.y
    const held = at - start.at > HOLD_MS
    const first = trail[0]
    const velocity = first && at > first.t ? (y - first.y) / (at - first.t) : 0
    const dragged = dragY.value !== null
    start = null
    settle()
    if (dragged) {
      const height = stage.offsetHeight || 1
      if (dy > 0 && (dy > height * 0.2 || velocity > FLICK_VELOCITY)) options.close()
      return
    }
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) return options.go(dx < 0 ? 1 : -1)
    if (Math.abs(dx) > SWIPE_PX || Math.abs(dy) > SWIPE_PX) return
    // A hold was reading the frame: let go and the story simply carries on.
    if (held) return
    const box = stage.getBoundingClientRect()
    options.go(x - box.left < box.width / 3 ? -1 : 1)
  }

  const handlers = {
    touchstart(event: TouchEvent) {
      const touch = event.touches[0]
      if (touch) begin(touch.clientX, touch.clientY, event.timeStamp)
    },
    touchmove(event: TouchEvent) {
      const touch = event.touches[0]
      if (touch) move(touch.clientX, touch.clientY, event.timeStamp)
    },
    touchend(event: TouchEvent) {
      const touch = event.changedTouches[0]
      if (!touch) return
      // The touch already moved the story; stop the synthetic click that follows.
      event.preventDefault()
      end(touch.clientX, touch.clientY, event.timeStamp, event.currentTarget as HTMLElement)
    },
    touchcancel: cancel,
    pointerdown(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      begin(event.clientX, event.clientY, event.timeStamp)
    },
    pointermove(event: PointerEvent) {
      if (event.pointerType !== 'touch') move(event.clientX, event.clientY, event.timeStamp)
    },
    pointerup(event: PointerEvent) {
      if (event.pointerType !== 'touch')
        end(event.clientX, event.clientY, event.timeStamp, event.currentTarget as HTMLElement)
    },
    pointercancel: cancel,
  }

  function cancel() {
    start = null
    settle()
  }

  onBeforeUnmount(() => clearTimeout(holdTimer))

  return { pressed, holding, dragY, frameStyle, handlers }
}
