<script setup lang="ts">
/**
 * The running analysis, folded: the chat's avatar inside a progress ring, «Разбираем «Дима»» and
 * «63%, ещё около минуты»: a card at the foot of the desktop sidebar (on a phone the running analysis is the
 * person's ring in «Разобрать ещё» on home). Tapping opens the details (AnalysisDetails).
 */
withDefaults(defineProps<{ variant?: 'card' }>(), { variant: 'card' })
const view = useAnalysisView()
const open = ref(false)
const { t } = useI18n()
const R = 18
const C = 2 * Math.PI * R
</script>

<template>
  <template v-if="view">
    <button
      type="button"
      class="live"
      :class="`live--${variant}`"
      aria-haspopup="dialog"
      :aria-label="`${view.title}. ${view.status}`"
      @click="open = true"
    >
      <span class="live__ring">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle class="live__track" cx="20" cy="20" :r="R" />
          <circle
            class="live__value"
            cx="20"
            cy="20"
            :r="R"
            :stroke-dasharray="C"
            :stroke-dashoffset="C * (1 - (view.percent ?? 0) / 100)"
          />
        </svg>
        <ChatAvatar v-if="view.chatId" :chat-id="view.chatId" :title="view.chat" size="sm" />
      </span>
      <span class="live__copy" aria-hidden="true">
        <span class="live__title">{{ view.title }}</span>
        <span class="live__status">{{ view.status }}</span>
      </span>
      <span v-if="view.queued" class="live__queued" :aria-label="t('analysis.queuedCount', { count: view.queued })"
        >+{{ view.queued }}</span
      >
    </button>
    <AnalysisDetails :open="open" @close="open = false" />
  </template>
</template>

<style scoped>
.live {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--duration-press) var(--ease-standard);
}

.live:active {
  transform: scale(var(--press-scale));
}

/* A floating control: the same family as «Новый анализ» — a raised pill, a ring and one soft shadow. */
.live--card {
  width: 100%;
  padding: var(--space-2);
  border-radius: var(--radius-well);
  background: var(--surface-2);
}

.live__ring {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
}

.live__ring svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.live__track,
.live__value {
  fill: none;
  stroke-width: 2.5;
}

.live__track {
  stroke: var(--border);
}

.live__value {
  stroke: var(--accent);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-chart) var(--ease-standard);
}

.live__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.live__title {
  overflow: hidden;
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live__status {
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 400;
}

.live__queued {
  flex: none;
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
