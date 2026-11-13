<script setup lang="ts">
import { Search } from '../../lib/icons'

/**
 * Phones and tablets: the chat list rests at the bottom of home — its handle and its search, the way a sheet in Apple
 * Maps rests at the bottom of the map. It is the edge of a real sheet: a pull follows the finger, and let go high
 * enough (or flicked) the whole list («Новый анализ», `?pick`) opens full screen from right where the edge was; a tap
 * opens it the same way. Closing, the list settles back into this edge. The page keeps room for it at its end, so it
 * never covers the last report. While an analysis runs the edge tells that instead (AnalysisLive): a tap opens the
 * details and cancel.
 */
const { t } = useI18n()
const route = useRoute()
const view = useAnalysisView()
/** No keyboard on open: raised while the sheet still travels, it made iOS pan the screen and the sheet's head left. */
const to = computed(() => ({ query: { ...route.query, pick: '' } }))

const root = ref<HTMLElement | null>(null)
/** How far the edge is pulled up, in px. */
const lift = ref(0)
const dragging = ref(false)
/** Let go above this, the list opens. */
const OPEN_LIFT = 64
/** An upward flick faster than this opens it however short (px per ms). */
const FLICK = 0.3
/** Moved less than this, it was a tap. */
const SLOP = 6

let start: number | null = null
let trail: { y: number; t: number }[] = []
let moved = false

/**
 * Where the list starts and where it settles back: the sheet (BottomSheet `rest`) reads these from the root, so it
 * grows out of the edge as it is now — pulled or not — and lands on it when it closes.
 */
function handOver() {
  const height = root.value?.offsetHeight ?? 0
  const style = document.documentElement.style
  style.setProperty('--peek-rise', `${height + lift.value}px`)
  style.setProperty('--peek-rest', `${height}px`)
}

function open() {
  handOver()
  void navigateTo(to.value)
}

function down(event: PointerEvent) {
  if (view.value || (event.pointerType === 'mouse' && event.button !== 0)) return
  start = event.clientY
  trail = [{ y: event.clientY, t: event.timeStamp }]
  moved = false
}

function move(event: PointerEvent) {
  if (start === null) return
  const pulled = start - event.clientY
  if (!dragging.value) {
    if (Math.abs(pulled) < SLOP) return
    // A drag, not a tap: the edge takes the pointer, so the link under the finger gets no click.
    dragging.value = true
    moved = true
    root.value?.setPointerCapture(event.pointerId)
  }
  // Up 1:1; down past its rest it barely gives.
  lift.value = pulled >= 0 ? pulled : -Math.sqrt(-pulled)
  trail = [...trail.filter((point) => event.timeStamp - point.t < 100), { y: event.clientY, t: event.timeStamp }]
}

function up() {
  if (start === null) return
  start = null
  if (!dragging.value) return
  dragging.value = false
  const first = trail[0]
  const last = trail.at(-1)
  const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
  if (lift.value > OPEN_LIFT || (velocity < -FLICK && lift.value > 0)) open()
  // Back to rest (or, opening, the edge leaves under the sheet that grows from it).
  lift.value = 0
}

function tap(event: MouseEvent) {
  // The end of a drag is not a tap.
  if (moved) {
    event.preventDefault()
    moved = false
    return
  }
  handOver()
}
</script>

<template>
  <div
    ref="root"
    class="peek"
    :class="{ 'is-dragging': dragging }"
    :style="lift ? { '--peek-lift': `${Math.max(0, lift)}px` } : undefined"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <span class="peek__handle" aria-hidden="true" />
    <AnalysisLive v-if="view" />
    <NuxtLink v-else :to="to" class="peek__search" draggable="false" @click="tap">
      <Search aria-hidden="true" />
      <span>{{ t('home.peekSearch') }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.peek {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-dock);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  /* Pulled up, it grows from the bottom under the finger; let go, it settles on the drawer curve. */
  padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px) + var(--peek-lift, 0px));
  box-shadow: var(--shadow-peek);
  touch-action: none;
  transition: padding-bottom var(--duration-sheet) var(--ease-drawer);
}

.peek.is-dragging {
  transition: none;
}

.peek__handle {
  width: var(--space-10);
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

.peek :deep(.live) {
  width: 100%;
}

/* The search of the list it opens: the grey of controls on a sheet (its muted words keep 4.5:1), a size a thumb finds. */
.peek__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: var(--control-md);
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-body);
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--duration-press) var(--ease-standard);
  --icon-size: var(--icon-md);
}

.peek__search:active {
  transform: scale(var(--press-scale));
}

@media (min-width: 901px) {
  .peek {
    display: none;
  }
}

@media print {
  .peek {
    display: none;
  }
}
</style>
