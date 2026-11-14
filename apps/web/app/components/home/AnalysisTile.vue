<script setup lang="ts">
/**
 * The analysis of a chat without a report yet, on home: the tile its report will be (concept Б, 14.11). It stands
 * where the report will land, in the person's colour, and its pulse is drawn from what has been read so far — at the
 * right, since the history is read from today back; dots for what is still ahead. The line says how far. A tap opens
 * the one sheet of the running analysis («Разбираем переписку», with cancel). When the report is saved the tile
 * simply becomes it.
 */
import type { ParseProgressDto } from '@tg-analyzer/shared'

const props = defineProps<{
  wide?: boolean
  hasAvatar?: boolean
  /** Done, its report not on home yet: the tile stays whole («Собираем отчёт…») until the report takes its place. */
  landing?: ParseProgressDto | null
}>()
const { t } = useI18n()
const view = useAnalysisView()
const analysis = useAnalysis()

const tile = computed(() => {
  if (view.value?.chatId) return { ...view.value, chatId: view.value.chatId }
  const job = props.landing
  if (!job?.chatId) return null
  const chat = job.chatTitle || t('analysis.untitledChat')
  const status = t('analysis.banner.saving')
  return {
    chatId: job.chatId,
    chat,
    title: t('analysis.banner.title', { chat }),
    status,
    short: status,
    pulse: job.pulse ?? [],
    share: 1,
  }
})
</script>

<template>
  <HomeCard
    v-if="tile"
    class="analysis-tile"
    :chat-id="tile.chatId"
    :title="tile.chat"
    :has-avatar="hasAvatar"
    :meta="tile.short"
    poster
    :wide="wide"
  >
    <Pulse :data="tile.pulse" :height="0" :bars="48" :pitch="6" :read="tile.share" />
    <button
      v-if="view"
      type="button"
      class="analysis-tile__open"
      aria-haspopup="dialog"
      :aria-label="`${tile.title}. ${tile.status}`"
      @click="analysis.details.value = true"
    />
  </HomeCard>
</template>

<style scoped>
/* The whole tile is the button, as a report tile is its link. */
.analysis-tile__open {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  -webkit-tap-highlight-color: transparent;
}

.analysis-tile__open:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

.analysis-tile:has(.analysis-tile__open:active) {
  transform: scale(var(--press-scale-lg));
  transition-duration: var(--duration-press);
}
</style>
