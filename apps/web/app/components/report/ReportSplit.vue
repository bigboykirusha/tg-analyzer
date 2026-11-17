<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Scale } from '../../lib/icons'

/**
 * «Баланс» — the first card of «Вы и {имя}», the first thing the report says after its own poster: who writes more,
 * as one figure («52 на 48» when it is about even, «×1,8» otherwise — `useBalance`), the split as one bar (you
 * in ink, them in their colour) and the two message counts under its ends. A white card like the others: the
 * person's colour is only in their side of the bar, so the poster above is the page's one lit surface. The counts live here and nowhere
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
    :icon="Scale"
    :title="t('report.balance.title')"
    :figure="shown.figure"
    :answer="shown.answer"
  >
    <!-- The two counts as numbers of their own over the ends of the bar: the card has no empty middle (17.11). -->
    <div class="split__sides">
      <p class="split__side">
        <b class="split__count">{{ formatNumber(split.sent) }}</b>
        <span class="split__key">{{ t('report.you') }}</span>
      </p>
      <p class="split__side split__side--theirs">
        <b class="split__count">{{ formatNumber(split.received) }}</b>
        <span class="split__key split__key--theirs">{{ name }}</span>
      </p>
    </div>
    <div class="split" aria-hidden="true">
      <i class="split__mine" :style="{ flexGrow: split.mine }" />
      <i class="split__theirs" :style="{ flexGrow: split.theirs }" />
    </div>
  </ReportSection>
</template>

<style scoped>
/*
 * You in ink, the other side in their colour, as every two-sided bar of the report. The bar sits at the foot of the
 * card: beside a taller card in the same row the figure stays at the top and the split at the bottom, no hole.
 */
.split {
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

/* The two counts stand under the ends of the bar they measure, each with the colour of its side. */
.split__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-label);
}

.split__key::before {
  content: '';
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--text);
}

.split__key--theirs::before {
  background: var(--them);
}

/* The counts and the bar sit at the foot of the card; beside a taller card the figure keeps the top. */
.split__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: auto;
}

.split__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.split__side--theirs {
  align-items: flex-end;
  text-align: right;
}

.split__count {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}
</style>
