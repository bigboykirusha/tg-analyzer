<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { Search, X } from '../../lib/icons'

/**
 * Phones and tablets: the chat list is one real sheet that rests at the bottom of home — its handle and its search
 * showing, the way a sheet rests at the bottom of Apple Maps — and is pulled up to the whole screen. A pull shows the
 * list under the finger; let go high enough (or flicked) it opens, otherwise it settles back; open, its head pulls
 * down to close. The search at rest is the same field as open: a tap opens the sheet, and only a tap on the open
 * field brings the keyboard (raised while the sheet travels, it made iOS pan the screen). Open, a close button stands
 * to the right of the search; there is no title row.
 *
 * The motion is the one every phone sheet has (base.css `.sheet-surface`, useSheetDrag): the sheet is one box of a
 * fixed height anchored to the bottom edge that only moves with `translate3d`; the scrim and the veil fade. The list
 * is not built until the first touch, and the scrim and the edge below the sheet exist only while it is open or
 * settling: at rest it is just the head.
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

/**
 * Where the sheet goes is decided at once, not when the URL catches up: between the two the sheet would be sent back
 * to rest for a frame. The route follows and confirms.
 */
const open = ref(route.query.pick !== undefined)
watch(
  () => route.query.pick !== undefined,
  (value) => {
    // The browser's back or forward moved it: the sheet travels, it does not jump.
    if (value !== open.value) drag.settle()
    open.value = value
  },
)
const search = ref('')

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

const wrap = ref<HTMLElement | null>(null)
const sheet = ref<HTMLElement | null>(null)
const head = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const safe = ref<HTMLElement | null>(null)
/** The sheet's height and how much of it shows at rest (the head plus the home indicator's strip). */
const height = ref(0)
const resting = ref(0)
function measure() {
  height.value = sheet.value?.offsetHeight ?? 0
  resting.value = (head.value?.offsetHeight ?? 0) + (safe.value?.offsetHeight ?? 0)
}

/** The list is built at the first touch or the first opening: home itself never pays for it. */
const listReady = ref(false)
watch(open, (value) => {
  if (value) listReady.value = true
  else search.value = ''
})
let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  for (const el of [sheet.value, head.value, safe.value]) if (el) observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

/**
 * Resting is `100% - the head`, worked out by the browser from the box itself (`--sheet-rest` is the head's measured
 * height), so the rest place does not depend on the viewport's height: when Safari's toolbar folds, the sheet stays
 * glued to the bottom edge. A finger writes `--sheet-y` (and the scrim's and veil's numbers) on the wrapper, once a
 * frame; letting go removes them and the classes carry the sheet from there.
 */
const closed = computed(() => Math.max(0, height.value - resting.value))
/** The first stretch of a pull over which the veil melts. */
const VEIL_PX = 48
const clamp = (value: number) => Math.min(1, Math.max(0, value))
function place(y: number) {
  const span = closed.value
  return {
    '--sheet-y': `${y}px`,
    '--sheet-p': String(span ? clamp(1 - y / span) : 0),
    '--sheet-v': String(clamp(1 - (span - y) / VEIL_PX)),
  }
}

function openSheet() {
  if (open.value) return
  drag.settle()
  open.value = true
  listReady.value = true
  void router.push({ query: { ...route.query, pick: '' } })
}
function closeSheet() {
  if (!open.value) return
  drag.settle()
  open.value = false
  field.value?.blur()
  if (typeof window.history.state?.back === 'string') router.back()
  else void router.replace({ query: { ...route.query, pick: undefined } })
}

const drag = useSheetDrag(sheet, {
  root: wrap,
  span: () => closed.value,
  isOpen: () => open.value,
  vars: place,
  // The close button keeps its own press; the open field its caret.
  ignore: (event) => open.value && !!(event.target as Element | null)?.closest('button, input'),
  onRelease: (toRest) => (toRest ? closeSheet() : openSheet()),
})
const handlers = {
  ...drag.handlers,
  pointerdown(event: PointerEvent) {
    listReady.value = true
    drag.handlers.pointerdown(event)
  },
}
useBodyScrollLock(open)
useFocusTrap(sheet, open, { onEscape: closeSheet, initial: () => sheet.value })

/**
 * A tap on the resting head opens the sheet — or, while it shows the analysis, its details; done, the report. The end
 * of a drag is not a tap.
 */
function tap() {
  if (drag.wasDrag() || open.value) return
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
  <div ref="wrap" class="chats" :class="{ 'is-open': open }" :style="{ '--sheet-rest': `${resting}px` }">
    <div class="sheet-dim chats__scrim" :class="{ 'is-live': open }" aria-hidden="true" @click="closeSheet" />
    <div class="sheet-under" aria-hidden="true" />
    <section
      ref="sheet"
      class="sheet-surface chats__sheet peek"
      :role="open ? 'dialog' : undefined"
      :aria-modal="open ? 'true' : undefined"
      :aria-label="t('newAnalysis.sheetTitle')"
      tabindex="-1"
    >
      <div ref="head" class="chats__head" v-on="handlers" @click="tap">
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
            :label="t('common.close')"
            :icon="X"
            no-tooltip
            :inert="!open || undefined"
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

/* At rest there is only the head: no scrim and no edge below it are drawn. They come with the first touch, the
   opening and the settling. */
.chats:not(.is-open, [data-sheet]) :is(.chats__scrim, .sheet-under) {
  visibility: hidden;
}

.chats__scrim {
  opacity: var(--sheet-p);
}

.chats__scrim.is-live {
  pointer-events: auto;
}

/* The screen under a gap (the status bar and a step, as the other sheets leave); at rest pushed down so only the
   head shows, with a light shadow. A box of a fixed height, glued to the bottom edge only. */
.chats__sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  height: calc(100svh - env(safe-area-inset-top, 0px) - var(--space-8));
  box-shadow: var(--shadow-peek);
  outline: none;
  --field-bg: var(--fill-raised);
  --group-bg: transparent;
  --group-ring: none;
  --group-radius: 0;
  --group-inset: var(--page-gutter);
  --group-bleed: var(--page-gutter);
}

.chats.is-open .chats__sheet {
  box-shadow: var(--shadow-overlay);
}

/* The transition runs only while the sheet opens, closes or springs back (useSheetDrag marks that). */
.chats:not([data-sheet]) :is(.chats__sheet, .chats__scrim, .sheet-under, .chats__veil) {
  transition: none;
}

.chats[data-sheet='drag'] .chats__veil {
  transition: none;
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

/* The search and, open, the close button at its right end. The bar's room for the button grows as the sheet opens
   (shortcut: one small row is laid out while the sheet travels; move it to a transform if it ever shows). */
.chats__bar {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  transition: padding-right var(--duration-sheet) var(--ease-drawer);
}

.chats.is-open .chats__bar {
  padding-right: calc(var(--control-md) + var(--space-2));
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

/* The close button waits in the bar's room (out of the layout) and fades in as the sheet opens. */
.chats__close {
  position: absolute;
  top: 0;
  right: 0;
  visibility: hidden;
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    visibility 0s linear var(--duration-fast);
}

.chats.is-open .chats__close {
  visibility: visible;
  opacity: 1;
  transition-delay: 0s;
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
  .chats__bar,
  .chats__close {
    transition-duration: var(--duration-none);
  }
}
</style>
