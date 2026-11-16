<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { Plus } from '../../lib/icons'

/**
 * Phones and tablets: the bottom of home is one bar to the screen's edge — the material of the header, a hairline on
 * top — with the screen's one action, «Разобрать чат», which opens «Новый анализ» as its own page (16.11: the chat
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
const label = computed(() => {
  if (running.value && view.value) return `${view.value.title}. ${view.value.status}`
  return t('dashboard.openReport')
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
  <div class="action-bar">
    <button v-if="running || ready" type="button" class="action-bar__pill" :aria-label="label" @click="tapPill">
      <AnalysisPill :ready="running ? null : ready" />
    </button>
    <UiButton v-else to="/new" variant="primary" size="lg" block :icon="Plus">{{ t('home.analyseChat') }}</UiButton>
  </div>
</template>

<style scoped>
.action-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-header);
  padding: var(--space-3) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  background: var(--header-glass);
  box-shadow: var(--divider-top);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
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
