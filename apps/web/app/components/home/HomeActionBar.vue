<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'

/**
 * Phones and tablets: the bottom of home is one bar to the screen's edge — the top of a sheet: its material, rounded
 * shoulders and shadow — with the screen's one action, «Разобрать чат», which opens «Новый анализ» as its own page (16.11: the chat
 * list as a sheet pulled up from below felt out of place in a browser). While an analysis runs the bar shows it
 * instead, in the person's colour (AnalysisPill, 14.11): a tap opens «Разбираем переписку». Done, the capsule says
 * «Открыть» for a few seconds while the report lands on home as a tile, then the button comes back.
 */
const { t } = useI18n()
const view = useAnalysisView()
const analysis = useAnalysis()

/** A report finished a moment ago: the bar opens it, then goes back to the button. */
const READY_MS = 6000
const ready = ref<ParseProgressDto | null>(null)
let readyTimer: ReturnType<typeof setTimeout> | undefined
watch(analysis.finished, (job) => {
  clearTimeout(readyTimer)
  ready.value = job?.status === 'completed' && job.chatId ? job : null
  if (ready.value) readyTimer = setTimeout(() => (ready.value = null), READY_MS)
})
onBeforeUnmount(() => clearTimeout(readyTimer))

const running = computed(() => Boolean(view.value?.chatId))
const readyName = computed(() => ready.value?.chatTitle || t('analysis.untitledChat'))
const label = computed(() => {
  if (running.value && view.value) return `${view.value.title}. ${view.value.status}`
  return `${t('dashboard.openReport')}: ${readyName.value}`
})
/** Said once when a report lands, for a screen reader: the capsule's change alone is silent. */
const announce = computed(() =>
  ready.value && !running.value ? `${t('dashboard.reportReady')}: ${readyName.value}` : '',
)

/**
 * The capsule and the button take turns in one place: if the focus was on the one that leaves, it moves to the one
 * that comes, instead of falling to the page's start.
 */
const root = ref<HTMLElement | null>(null)
watch([running, ready], async () => {
  const had = root.value?.contains(document.activeElement)
  await nextTick()
  if (had) root.value?.querySelector<HTMLElement>('a, button')?.focus()
})

function tapPill() {
  if (running.value) {
    analysis.details.value = true
    return
  }
  const chatId = ready.value?.chatId
  ready.value = null
  if (chatId) void navigateTo(`/chat/${chatId}`)
}
</script>

<template>
  <div ref="root" class="action-bar">
    <p class="sr-only" aria-live="polite">{{ announce }}</p>
    <button v-if="running || ready" type="button" class="action-bar__pill" :aria-label="label" @click="tapPill">
      <AnalysisPill :ready="running ? null : ready" />
    </button>
    <UiButton v-else to="/new" variant="primary" size="lg" block>{{ t('home.analyseChat') }}</UiButton>
  </div>
</template>

<style scoped>
.action-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-header);
  padding: var(--space-4) var(--page-gutter) calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  /* The top of a sheet (17.11, drawn 18.11): its material, its rounded shoulders and its shadow. */
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.action-bar__pill {
  display: block;
  width: 100%;
  border-radius: var(--radius-pill);
  transition: transform var(--duration-press) var(--ease-standard);
}

.action-bar__pill:active {
  transform: scale(var(--press-scale));
}

.action-bar__pill:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}
</style>
