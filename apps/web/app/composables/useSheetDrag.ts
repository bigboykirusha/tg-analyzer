import type { Ref } from 'vue'

/** A flick faster than this closes the sheet however short it was (px per ms). */
const FLICK_VELOCITY = 0.11
/** Dragged further than this share of its height, the sheet closes on release. */
const CLOSE_SHARE = 0.3

/**
 * Drag-to-dismiss for every sheet on a phone (`UiBottomSheet`, and `UiModalDialog` below 640px):
 * the sheet follows the finger down 1:1, resists like rubber upwards, and on release either springs
 * back or closes. A closing sheet leaves from where the finger let go, because the offset lives in a
 * CSS variable (`--sheet-drag`) that the leave transition reads, not in an inline transform it can't
 * override. Bind `handlers` to the grabber area and `style` to the panel. `close` returns false when
 * the sheet can't close right now (busy): it then springs back.
 */
export function useSheetDrag(panel: Ref<HTMLElement | null>, close: () => boolean) {
  const offset = ref(0)
  const dragging = ref(false)
  let start: number | null = null
  let trail: { y: number; t: number }[] = []

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Buttons in the sheet's header (close, back) keep their own press: a drag starts elsewhere.
    if ((event.target as Element | null)?.closest('button, a, input, [role="button"]')) return
    start = event.clientY
    trail = [{ y: event.clientY, t: event.timeStamp }]
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (start === null) return
    const delta = event.clientY - start
    offset.value = delta >= 0 ? delta : -Math.sqrt(-delta) * 2
    trail = [...trail.filter((point) => event.timeStamp - point.t < 100), { y: event.clientY, t: event.timeStamp }]
  }

  function onPointerUp() {
    if (start === null) return
    const height = panel.value?.offsetHeight ?? 0
    const first = trail[0]
    const last = trail.at(-1)
    const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
    const closing =
      offset.value > 0 && (velocity > FLICK_VELOCITY || (height > 0 && offset.value > height * CLOSE_SHARE))
    start = null
    dragging.value = false
    if (closing) {
      // The offset stays: the leave transition starts from here and carries on down.
      if (close()) return
    }
    offset.value = 0
  }

  const style = computed(() => (offset.value ? { '--sheet-drag': `${offset.value}px` } : undefined))
  const handlers = {
    pointerdown: onPointerDown,
    pointermove: onPointerMove,
    pointerup: onPointerUp,
    pointercancel: onPointerUp,
  }
  /** A sheet that opens again starts in place. */
  function reset() {
    offset.value = 0
    dragging.value = false
    start = null
  }
  return { offset, dragging, style, handlers, reset }
}
