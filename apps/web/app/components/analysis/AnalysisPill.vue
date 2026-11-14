<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { hueOf } from '../../lib/hue'

/**
 * The running analysis in the bottom panel of a phone's home, in place of the search (concept M1, 14.11): a capsule in
 * the person's colour — avatar, name, how far back the reading got, a small pulse filling from today back, the
 * percentage. Done, it says «Отчёт готов» and «Открыть» for a few seconds (M5) while the report lands on home as a
 * tile. A picture only: the panel's head takes the tap (HomeChatsSheet).
 */
const props = defineProps<{ ready?: ParseProgressDto | null }>()
const { t } = useI18n()
const view = useAnalysisView()

const pill = computed(() => {
  const job = props.ready
  if (job?.chatId) {
    const chat = job.chatTitle || t('analysis.untitledChat')
    return { chatId: job.chatId, chat, line: t('analysis.done.title'), ready: true as const }
  }
  const live = view.value
  if (!live?.chatId) return null
  return {
    chatId: live.chatId,
    chat: live.chat,
    line: live.reached ?? live.status,
    ready: false as const,
    percent: live.percent,
    share: live.share,
    pulse: live.pulse,
  }
})
</script>

<template>
  <div v-if="pill" class="pill" :data-hue="hueOf(pill.chatId)" aria-hidden="true">
    <ChatAvatar :chat-id="pill.chatId" :title="pill.chat" size="sm" on-poster />
    <span class="pill__copy">
      <span class="pill__name">{{ pill.chat }}</span>
      <span class="pill__line">{{ pill.line }}</span>
    </span>
    <template v-if="!pill.ready">
      <Pulse class="pill__pulse" :data="pill.pulse" :height="0" :bars="24" :pitch="5" :read="pill.share" />
      <span v-if="pill.percent !== null" class="pill__percent">{{ pill.percent }}%</span>
    </template>
    <span v-else class="pill__open">{{ t('analysis.pill.open') }}</span>
  </div>
</template>

<style scoped>
.pill {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--space-12);
  padding: var(--space-1) var(--space-4) var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-ahead: var(--on-poster-faint);
  --pulse-half: var(--space-2);
}

.pill__copy {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  min-width: 0;
}

.pill__name {
  overflow: hidden;
  font: var(--text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill__line {
  overflow: hidden;
  color: var(--on-poster-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill__pulse {
  flex: 1;
  min-width: var(--space-12);
}

.pill__percent {
  flex: none;
  font: var(--text-label);
}

/* The report is ready: the one action, in the poster's ink. */
.pill__open {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: var(--control-sm);
  margin-left: auto;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--on-poster);
  color: var(--poster);
  font: var(--text-label);
}
</style>
