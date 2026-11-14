<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Scale } from '../../lib/icons'

/**
 * «Баланс» — the poster of «Вы и {имя}», the first thing the report says after its own poster: who writes more,
 * as one figure («52 на 48» when it is about even, «×1,8» otherwise — `useBalance`), the split as one bar (you
 * in ink, them in their colour) and the two message counts under its ends. The counts live here and nowhere
 * else: «Кто кого» below starts with who opens the conversation. Carries `#part-balance`.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()
const { name, answer, headline } = useBalance(() => props.data)

const split = computed(() => {
  const { sent, received } = props.data.report.totals
  const total = sent + received
  if (!total) return null
  const mine = Math.round((100 * sent) / total)
  return { mine, theirs: 100 - mine, sent, received }
})

const shown = computed(() => {
  if (!answer.value || !split.value) return null
  return {
    figure: headline.value,
    answer: answer.value,
  }
})
</script>

<template>
  <ReportSection
    v-if="shown && split"
    id="part-balance"
    tone="ink"
    :icon="Scale"
    :title="t('report.balance.title')"
    :figure="shown.figure"
    :answer="shown.answer"
  >
    <div class="split" aria-hidden="true">
      <i class="split__mine" :style="{ flexGrow: split.mine }" />
      <i class="split__theirs" :style="{ flexGrow: split.theirs }" />
    </div>
    <p class="split__counts t-label">
      <span>{{ t('report.balance.countMine', { count: formatNumber(split.sent) }) }}</span>
      <span>{{ t('report.balance.countTheirs', { name, count: formatNumber(split.received) }) }}</span>
    </p>
  </ReportSection>
</template>

<style scoped>
/*
 * You in ink, the other side in their colour, as every two-sided bar of the report. The bar sits at the foot of the
 * card: beside a taller card in the same row the figure stays at the top and the split at the bottom, no hole.
 */
.split {
  margin-top: auto;
  display: flex;
  gap: var(--space-0-5);
  height: var(--space-3);
}

.split i {
  flex-basis: 0;
  border-radius: var(--radius-pill);
}

.split__mine {
  background: var(--text);
}

.split__theirs {
  background: var(--them);
}

/* The two counts stand under the ends of the bar they measure. */
.split__counts {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
}
</style>
