<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { Search, X } from '../../lib/icons'

/**
 * Phones and tablets: the chat list is one real sheet that rests at the bottom of home — its handle and its search
 * showing, the way a sheet rests at the bottom of Apple Maps — and is pulled up to the whole screen. The list is in it
 * all the time, so a pull shows it under the finger; let go high enough (or flicked) it opens, otherwise it settles
 * back; open, its head pulls down to close. The search at rest is the same field as open: a tap opens the sheet, and
 * only a tap on the open field brings the keyboard (raised while the sheet travels, it made iOS pan the screen). Open,
 * a close button stands to the right of the search; there is no title row.
 *
 * The motion is transform and opacity only, on layers that never change size: the sheet is one box (its open height)
 * that moves with `translateY`, the scrim and the veil fade. Nothing is laid out while it travels.
 *
 * Open is a URL (`?pick`), so the browser's back closes it. While an analysis runs, the resting head shows it in
 * place of the search (AnalysisPill, concept M1, 14.11): a tap opens «Разбираем переписку»; a pull still brings the
 * list up, to queue the next one. Done, the head says «Отчёт готов · Открыть» for a few seconds while the report lands
 * on home. The page keeps room for the head at its end.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const view = useAnalysisView()
const analysis = useAnalysis()

/** A report finished a moment ago: the head says so and opens it, then goes back to the search. */
const READY_MS = 6000
const ready = ref<ParseProgressDto | null>(null)
let readyTimer: ReturnType<typeof setTimeout> | undefined
watch(analysis.finished, (job) => {
  clearTimeout(readyTimer)
  ready.value = job?.status === 'completed' && job.chatId ? job : null
  if (ready.value) readyTimer = setTimeout(() => (ready.value = null), READY_MS)
})
onBeforeUnmount(() => clearTimeout(readyTimer))
/**
 * An analysis ordered from the open sheet folds it (14.11): the person's capsule takes the head at once, so what was
 * ordered is seen; a failed start (a limit, a small chat) keeps the list open with its message.
 */
const actions = useReportActions()
watch(actions.starting, (now, before) => {
  if (before && !now && open.value && actions.busy(before)) closeSheet()
})
/** The head shows the analysis (or its result) instead of the search, at rest only. */
const showPill = computed(() => !open.value && (Boolean(view.value?.chatId) || Boolean(ready.value)))

const open = computed(() => route.query.pick !== undefined)
const search = ref('')

const wrap = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const head = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const safe = ref<HTMLElement | null>(null)
/** The sheet's height and how much of it shows at rest (the head plus the home indicator's strip). */
const height = ref(0)
const resting = ref(0)
function measure() {
  height.value = root.value?.offsetHeight ?? 0
  resting.value = (head.value?.offsetHeight ?? 0) + (safe.value?.offsetHeight ?? 0)
}

/** The list is built a moment after home, or at the first touch: the sheet never waits for it, a pull shows it. */
const listReady = ref(false)
let observer: ResizeObserver | null = null
let frame = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (root.value) observer.observe(root.value)
  if (head.value) observer.observe(head.value)
  if (safe.value) observer.observe(safe.value)
  window.setTimeout(() => (listReady.value = true), 600)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
  clearTimeout(settleTimer)
})

/**
 * Where the sheet goes is decided at once (`shown`), not when the URL catches up: between the two the sheet would be
 * sent back to rest for a frame. The route follows and confirms.
 */
const shown = ref(open.value)
watch(open, (value) => (shown.value = value))

/**
 * Resting is `100% - the head`, worked out by the browser from the box itself, so when Safari's toolbar folds and the
 * viewport grows the sheet stays glued to the bottom edge: no script number can go stale. A finger writes `--sheet-y`
 * (and the scrim's and veil's numbers) straight on the wrapper, once a frame — no re-render per move; letting go
 * removes them and the classes carry the sheet from there.
 */
const closed = computed(() => Math.max(0, height.value - resting.value))
const dragging = ref(false)
/** From a release until the sheet has landed: only then is its layer promoted. */
const settling = ref(false)
function settle() {
  settling.value = true
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => (settling.value = false), 520)
}

/** The first stretch of a pull over which the veil melts. */
const VEIL_PX = 48
function place(y: number) {
  const el = wrap.value
  if (!el) return
  const span = closed.value
  el.style.setProperty('--sheet-y', `${y}px`)
  el.style.setProperty('--sheet-p', String(span ? Math.min(1, Math.max(0, 1 - y / span)) : 0))
  el.style.setProperty('--sheet-v', String(Math.min(1, Math.max(0, 1 - (span - y) / VEIL_PX))))
}
function unplace() {
  const el = wrap.value
  if (!el) return
  for (const name of ['--sheet-y', '--sheet-p', '--sheet-v']) el.style.removeProperty(name)
}
/** Where the sheet is on screen right now, even in flight: a new touch picks it up from there. */
function currentY() {
  if (!root.value) return 0
  return new DOMMatrixReadOnly(getComputedStyle(root.value).transform).m42
}
/** Past either end it gives a little, like rubber. */
function rubber(raw: number) {
  if (raw < 0) return -Math.sqrt(-raw) * 2
  if (raw > closed.value) return closed.value + Math.sqrt(raw - closed.value) * 2
  return raw
}

function openSheet() {
  if (open.value) return
  settle()
  shown.value = true
  void router.push({ query: { ...route.query, pick: '' } })
}
function closeSheet() {
  if (!open.value) return
  settle()
  shown.value = false
  field.value?.blur()
  if (typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}

watch(open, (value) => {
  if (!value) search.value = ''
})
useBodyScrollLock(open)
useFocusTrap(root, open, { onEscape: closeSheet, initial: () => root.value })

/** Moved less than this, it was a tap. */
const SLOP = 6
/** Let go further than this from where it started, it goes on. */
const TRAVEL = 64
/** A flick faster than this goes on however short (px per ms). */
const FLICK = 0.3
/** A touch this close to the left edge belongs to the browser's back swipe. */
const EDGE = 20
let start: number | null = null
let origin = 0
let delta = 0
let trail: { y: number; t: number }[] = []
let moved = false

function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // The close button keeps its own press; the open field its caret.
  if (open.value && (event.target as Element | null)?.closest('button, input')) return
  // Not from the screen's left edge: that swipe is Safari's «back».
  if (event.clientX < EDGE) return
  listReady.value = true
  // The head keeps the pointer from the first touch, wherever the finger goes (a mouse too); a tap still clicks it.
  head.value?.setPointerCapture(event.pointerId)
  start = event.clientY
  origin = currentY()
  delta = 0
  trail = [{ y: event.clientY, t: event.timeStamp }]
  moved = false
}

function move(event: PointerEvent) {
  if (start === null) return
  const next = event.clientY - start
  if (!dragging.value) {
    if (Math.abs(next) < SLOP) return
    // Picked up from wherever it is, in flight or not: its place is written as the transition goes off.
    place(origin)
    dragging.value = true
    moved = true
  }
  delta = next
  trail = [...trail.filter((point) => event.timeStamp - point.t < 100), { y: event.clientY, t: event.timeStamp }]
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0
      if (dragging.value) place(rubber(origin + delta))
    })
  }
}

function up() {
  if (start === null) return
  start = null
  cancelAnimationFrame(frame)
  frame = 0
  if (!dragging.value) return
  const first = trail[0]
  const last = trail.at(-1)
  const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0
  const goesOpen = shown.value ? !(delta > TRAVEL || velocity > FLICK) : delta < -TRAVEL || velocity < -FLICK
  // The finger's last place is written once more, so the flight starts exactly there; then the classes carry it.
  place(rubber(origin + delta))
  dragging.value = false
  settle()
  shown.value = goesOpen
  requestAnimationFrame(unplace)
  if (goesOpen && !open.value) openSheet()
  else if (!goesOpen && open.value) closeSheet()
}

/**
 * A tap on the resting head opens the sheet — or, while it shows the analysis, its details; done, the report. The end
 * of a drag is not a tap.
 */
function tap() {
  if (moved) {
    moved = false
    return
  }
  if (open.value) return
  if (view.value?.chatId) analysis.details.value = true
  else if (ready.value?.chatId) openReady()
  else openSheet()
}
function openReady() {
  const chatId = ready.value?.chatId
  ready.value = null
  if (chatId) void navigateTo(`/chat/${chatId}`)
}
</script>

<template>
  <div
    ref="wrap"
    class="chats"
    :class="{ 'is-open': shown, 'is-dragging': dragging, 'is-settling': settling }"
    :style="{ '--sheet-rest': `${resting}px` }"
  >
    <div class="chats__scrim" :class="{ 'is-live': open }" aria-hidden="true" @click="closeSheet" />
    <section
      ref="root"
      class="chats__sheet peek"
      :role="open ? 'dialog' : undefined"
      :aria-modal="open ? 'true' : undefined"
      :aria-label="t('newAnalysis.sheetTitle')"
      tabindex="-1"
    >
      <div
        ref="head"
        class="chats__head"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @click="tap"
      >
        <span class="chats__handle" aria-hidden="true" />
        <span class="chats__veil" aria-hidden="true" />
        <AnalysisPill v-if="showPill" :ready="view ? null : ready" />
        <div v-else class="chats__bar">
          <label class="chats__search">
            <Search aria-hidden="true" />
            <input
              ref="field"
              v-model="search"
              type="search"
              name="chat-search"
              autocomplete="off"
              enterkeyhint="search"
              spellcheck="false"
              :readonly="!open"
              :tabindex="open ? 0 : -1"
              :placeholder="t('home.peekSearch')"
              :aria-label="t('home.peekSearch')"
            />
          </label>
          <UiIconButton
            class="chats__close"
            :class="{ 'is-shown': open }"
            :label="t('common.close')"
            :icon="X"
            no-tooltip
            :tabindex="open ? 0 : -1"
            :aria-hidden="open ? undefined : 'true'"
            @click="closeSheet"
          />
        </div>
        <!-- Keyboard users reach the resting sheet through this; a pointer taps the head. -->
        <button v-if="!open && view?.chatId" type="button" class="sr-only" @click.stop="analysis.details.value = true">
          {{ `${view.title}. ${view.status}` }}
        </button>
        <button v-else-if="!open && ready" type="button" class="sr-only" @click.stop="openReady">
          {{ t('dashboard.openReport') }}
        </button>
        <button v-else-if="!open" type="button" class="sr-only" @click.stop="openSheet">
          {{ t('home.peekSearch') }}
        </button>
      </div>
      <div class="chats__body" :inert="!open || undefined">
        <ChatPicker v-if="listReady" v-model:search="search" :own-search="false" />
      </div>
      <span ref="safe" class="chats__safe" aria-hidden="true" />
    </section>
  </div>
</template>

<style scoped>
/* Where the sheet, the scrim and the veil are, as numbers a finger can overwrite on this element: at rest the sheet
   is its own height less the head, open it is 0. */
.chats {
  --sheet-y: calc(100% - var(--sheet-rest, 0px));
  --sheet-p: 0;
  --sheet-v: 1;
}

.chats.is-open {
  --sheet-y: 0px;
  --sheet-p: 1;
  --sheet-v: 0;
}

/* A little taller than the screen below: nothing can show under the edge while Safari's toolbar moves. */
.chats__scrim {
  position: fixed;
  inset: 0 0 calc(-1 * var(--space-12));
  z-index: var(--z-modal);
  background: var(--scrim);
  opacity: var(--sheet-p);
  pointer-events: none;
  transition: opacity var(--duration-sheet) var(--ease-drawer);
}

.chats__scrim.is-live {
  pointer-events: auto;
}

.chats.is-dragging .chats__scrim,
.chats.is-dragging .chats__veil {
  transition: none;
}

.chats.is-settling .chats__scrim {
  will-change: opacity;
}

/* The screen under a gap (the status bar and a step, as the other sheets leave); at rest pushed down so only the
   head shows. Open, it is a sheet like theirs: round shoulders, their shadow, the scrim and the page behind it.
   One box, always: it only moves. */
.chats__sheet {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--space-8));
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-peek);
  outline: none;
  transform: translate3d(0, var(--sheet-y), 0);
  transition: transform var(--duration-sheet) var(--ease-drawer);
  --field-bg: var(--fill-raised);
  --group-bg: transparent;
  --group-ring: none;
  --group-radius: 0;
  --group-inset: var(--page-gutter);
  --group-bleed: var(--page-gutter);
}

/* The sheet's surface goes on below its edge: whatever the toolbar does, no page shows under it. */
.chats__sheet::after {
  content: '';
  position: absolute;
  top: calc(100% - 1px);
  right: 0;
  left: 0;
  height: 100vh;
  background: var(--surface-raised);
  pointer-events: none;
}

.chats.is-dragging .chats__sheet {
  transition: none;
}

.chats.is-dragging .chats__sheet,
.chats.is-settling .chats__sheet {
  will-change: transform;
}

.chats.is-open .chats__sheet {
  box-shadow: var(--shadow-overlay);
}

.chats__head {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  position: relative;
  padding: var(--space-2) var(--page-gutter) var(--space-3);
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

/* At rest the home indicator's strip under the head is the sheet too, and the list would peek into it (an installed
   app has the strip; Safari's toolbar hides it). A veil of the sheet's own surface covers it and melts over the first
   stretch of a pull, so the chats still come up under the finger. */
.chats__veil {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: var(--z-raise);
  height: env(safe-area-inset-bottom, 0px);
  background: var(--surface-raised);
  opacity: var(--sheet-v);
  pointer-events: none;
  transition: opacity var(--duration-sheet) var(--ease-drawer);
}

.chats__head :deep(.pill) {
  width: 100%;
}

.chats__handle {
  width: var(--space-10);
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

/* The search and, open, the close button beside it on one line. */
.chats__bar {
  display: flex;
  align-items: center;
  width: 100%;
}

/* One field at rest and open: the grey of controls on a sheet, a size a thumb finds. */
.chats__search {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  height: var(--control-md);
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-body);
  --icon-size: var(--icon-md);
}

.chats__search:focus-within {
  box-shadow: var(--ring-field-focus);
}

.chats__search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;
  color: var(--text);
  outline: none;
  appearance: none;
}

/* At rest the field is a picture of itself: the head takes the tap. */
.chats:not(.is-open) .chats__search input {
  pointer-events: none;
}

.chats__search input::placeholder {
  color: var(--text-muted);
}

.chats__search input::-webkit-search-cancel-button {
  display: none;
}

/* The close button appears beside the search as the sheet opens: its room is taken at once (nothing is laid out while
   the sheet travels), only its opacity moves. */
.chats__close {
  flex: none;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.chats__close.is-shown {
  max-width: var(--control-md);
  margin-left: var(--space-2);
  opacity: 1;
}

.chats__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--page-gutter) calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
}

/* Measures the home indicator's strip (env() cannot be read from script). */
.chats__safe {
  position: absolute;
  bottom: 0;
  width: 0;
  height: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
}

@media (min-width: 901px) {
  .chats {
    display: none;
  }
}

@media print {
  .chats {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chats__sheet,
  .chats__scrim,
  .chats__veil,
  .chats__close {
    transition-duration: var(--duration-none);
  }
}
</style>
