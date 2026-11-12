<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Shapes } from '../../lib/icons'
import type { ReportTile } from './ReportTiles.vue'

/**
 * «Из чего переписка»: the share of plain text as the one big number, how long a text usually is, the bar
 * of text against everything else, and each kind of message as a number of its own — photos and videos,
 * stickers, voice messages, files. A kind that never came up is left out.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()

const stats = computed(() => props.data.derived.compositionStats)
const composition = computed(() => props.data.report.composition)

const tiles = computed<ReportTile[]>(() => {
  const counts = composition.value
  return (
    [
      ['text', counts.text],
      ['media', counts.media],
      ['sticker', counts.sticker],
      ['voice', counts.voice],
      ['file', counts.file],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: t(`report.formats.kind.${key}`), value: formatNumber(count) }))
})

const share = computed(() => stats.value.textSharePct)
const answer = computed(() => {
  const chars = stats.value.avgCharsPerTextMessage
  if (!chars) return t('report.formats.answerPlain')
  const rounded = Math.round(chars)
  return tc('report.formats.answer', rounded, { count: formatNumber(rounded) })
})
</script>

<template>
  <ReportSection
    v-if="share !== null && tiles.length > 1"
    :icon="Shapes"
    :title="t('report.formats.title')"
    :figure="formatPercent(share)"
    :answer="answer"
  >
    <div class="share" aria-hidden="true">
      <i class="share__text" :style="{ flexGrow: share }" />
      <i class="share__rest" :style="{ flexGrow: 100 - share }" />
    </div>
    <ReportTiles :tiles="tiles" />
  </ReportSection>
</template>

<style scoped>
.share {
  display: flex;
  gap: var(--space-0-5);
  height: var(--space-3);
}

.share i {
  flex-basis: 0;
  border-radius: var(--radius-pill);
}

.share__text {
  background: var(--them);
}

.share__rest {
  background: var(--room-tint);
}
</style>
