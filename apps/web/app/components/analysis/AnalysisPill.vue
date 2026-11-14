<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { hueOf } from '../../lib/hue'

/**
 * The running analysis in the bottom panel of a phone's home, in place of the search (concept M1, 14.11): a capsule in
 * the person's colour as tall as the search it replaces — avatar, name, a small pulse filling from today back, the
 * percentage; one line (how far back the reading got is in «Разбираем переписку»). Done, «Открыть» takes the
 * percentage's place for a few seconds (M5) while the report lands on home as a tile — the button itself says it is
 * ready. A picture only: the panel's head takes the tap (HomeChatsSheet).
 */
const props = defineProps<{ ready?: ParseProgressDto | null }>()
const { t } = useI18n()
const view = useAnalysisView()

const pill = computed(() => {
  const job = props.ready
  if (job?.chatId) {
    const chat = job.chatTitle || t('analysis.untitledChat')
    return { chatId: job.chatId, chat, ready: true as const }
  }
  const live = view.value
  if (!live?.chatId) return null
  return {
    chatId: live.chatId,
    chat: live.chat,
    ready: false as const,
    percent: live.percent,
    note: live.note,
    share: live.share,
    pulse: live.pulse,
  }
})
</script>

<template>
  <div
    v-if="pill"
    class="pill"
    :class="{ 'pill--ready': pill.ready }"
    :data-hue="hueOf(pill.chatId)"
    aria-hidden="true"
  >
    <ChatAvatar :chat-id="pill.chatId" :title="pill.chat" size="sm" on-poster />
    <span class="pill__name">{{ pill.chat }}</span>
    <template v-if="!pill.ready">
      <Pulse class="pill__pulse" :data="pill.pulse" :height="0" :bars="24" :pitch="5" :read="pill.share" />
      <span v-if="pill.note" class="pill__percent">{{ pill.note }}</span>
      <span v-else-if="pill.percent !== null" class="pill__percent">{{ pill.percent }}%</span>
    </template>
    <span v-else class="pill__open">{{ t('analysis.pill.open') }}</span>
  </div>
</template>

<style scoped>
/* As tall as the search it replaces, so the panel does not move; the avatar sits concentric in the round end. */
.pill {
  --pill-inset: calc((var(--control-md) - var(--avatar-sm)) / 2);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: var(--control-md);
  padding: 0 var(--space-4) 0 var(--pill-inset);
  border-radius: var(--radius-pill);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-ahead: var(--on-poster-faint);
  --pulse-half: var(--space-2);
}

.pill__name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font: var(--text-body);
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

/* The report is ready: the one action, in the poster's ink, at the avatar's inset from the other end — a capsule inside
   the capsule, concentric with it. */
.pill--ready {
  padding-right: var(--pill-inset);
}

.pill__open {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: var(--avatar-sm);
  margin-left: auto;
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--on-poster);
  color: var(--poster);
  font: var(--text-label);
}
</style>
