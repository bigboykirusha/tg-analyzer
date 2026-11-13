<script setup lang="ts">
import { Search, X } from '../../lib/icons'

/**
 * Phones and tablets: the chat list is one real sheet that rests at the bottom of home — its handle and its search
 * showing, the way a sheet rests at the bottom of Apple Maps — and is pulled up to the whole screen. The list is in it
 * all the time, so a pull shows the chats under the finger; let go high enough (or flicked) it opens, otherwise it
 * settles back; open, its head pulls down to close. The search at rest is the same field as open: a tap opens the
 * sheet, and only a tap on the open field brings the keyboard (raised while the sheet travels, it made iOS pan the
 * screen). Open, a close button stands to the right of the search; there is no title row.
 *
 * Open is a URL (`?pick`), so the browser's back closes it. While an analysis runs, the resting head shows it instead
 * of the search (AnalysisLive): a tap opens the details and cancel. The page keeps room for the head at its end.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const view = useAnalysisView()

const open = computed(() => route.query.pick !== undefined)
const search = ref('')

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
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (root.value) observer.observe(root.value)
  if (head.value) observer.observe(head.value)
  window.setTimeout(() => (listReady.value = true), 600)
})
onBeforeUnmount(() => observer?.disconnect())

/** Where the sheet sits: 0 is open (its top at the top of the screen), `closed` shows only the head. */
const closed = computed(() => Math.max(0, height.value - resting.value))
const drag = ref(0)
const dragging = ref(false)
const y = computed(() => {
  const base = open.value ? 0 : closed.value
  const raw = base + drag.value
  // Past either end it gives a little, like rubber.
  if (raw < 0) return -Math.sqrt(-raw) * 2
  if (raw > closed.value) return closed.value + Math.sqrt(raw - closed.value) * 2
  return raw
})
/** 0 at rest, 1 open: the scrim follows. */
const progress = computed(() => (closed.value ? Math.min(1, Math.max(0, 1 - y.value / closed.value)) : 0))

function openSheet() {
  if (open.value) return
  void router.push({ query: { ...route.query, pick: '' } })
}
function closeSheet() {
  if (!open.value) return
  field.value?.blur()
  if (typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}

watch(open, (value) => {
  drag.value = 0
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
let start: number | null = null
let trail: { y: number; t: number }[] = []
let moved = false

function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // The close button keeps its own press; the open field its caret.
  if (open.value && (event.target as Element | null)?.closest('button, input')) return
  listReady.value = true
  // The head keeps the pointer from the first touch, wherever the finger goes (a mouse too); a tap still clicks it.
  head.value?.setPointerCapture(event.pointerId)
  start = event.clientY
  trail = [{ y: event.clientY, t: event.timeStamp }]
  moved = false
}

function move(event: PointerEvent) {
  if (start === null) return
  const delta = event.clientY - start
  if (!dragging.value) {
    if (Math.abs(delta) < SLOP) return
    dragging.value = true
    moved = true
  }
  drag.value = delta
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
  const travelled = drag.value
  drag.value = 0
  if (!open.value && (travelled < -TRAVEL || velocity < -FLICK)) openSheet()
  else if (open.value && (travelled > TRAVEL || velocity > FLICK)) closeSheet()
}

/** A tap on the resting head opens the sheet; the end of a drag is not a tap. */
function tap() {
  if (moved) {
    moved = false
    return
  }
  if (!open.value && !view.value) openSheet()
}
</script>

<template>
  <div class="chats" :class="{ 'is-open': open }">
    <div
      class="chats__scrim"
      :style="{ opacity: progress }"
      :class="{ 'is-dragging': dragging }"
      aria-hidden="true"
      @click="closeSheet"
    />
    <section
      ref="root"
      class="chats__sheet peek"
      :class="{ 'is-dragging': dragging }"
      :style="{ transform: `translateY(${y}px)` }"
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
        <AnalysisLive v-if="view && !open" />
        <div v-else class="chats__bar">
          <label class="chats__search">
            <Search aria-hidden="true" />
            <input
              ref="field"
              v-model="search"
              type="search"
              name="chat-search"
              autocomplete="off"
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
        <button v-if="!open && !view" type="button" class="sr-only" @click.stop="openSheet">
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
.chats__scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--scrim);
  pointer-events: none;
  transition: opacity var(--duration-sheet) var(--ease-drawer);
}

.chats.is-open .chats__scrim {
  pointer-events: auto;
}

.chats__scrim.is-dragging {
  transition: none;
}

/* The whole screen but the status bar; at rest pushed down so only the head shows. */
.chats__sheet {
  position: fixed;
  top: env(safe-area-inset-top, 0px);
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
  transition: transform var(--duration-sheet) var(--ease-drawer);
  --field-bg: var(--fill-raised);
  --group-bg: transparent;
  --group-ring: none;
  --group-radius: 0;
  --group-inset: var(--page-gutter);
  --group-bleed: var(--page-gutter);
}

.chats__sheet.is-dragging {
  transition: none;
}

.chats__head {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--page-gutter) var(--space-3);
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.chats__handle {
  width: var(--space-10);
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

.chats__head :deep(.live) {
  width: 100%;
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

/* The close button slides in beside the search as the sheet opens. */
.chats__close {
  flex: none;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-width var(--duration-sheet) var(--ease-drawer),
    margin-left var(--duration-sheet) var(--ease-drawer),
    opacity var(--transition-fast);
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
  .chats__close {
    transition-duration: var(--duration-none);
  }
}
</style>
