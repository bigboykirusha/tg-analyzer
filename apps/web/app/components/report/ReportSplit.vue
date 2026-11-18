<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Scale } from '../../lib/icons'

/**
 * «Баланс» — the first card of «Вы и {имя}», the first thing the report says after its own poster: who writes more,
 * as one figure («52 на 48» when it is about even, «×1,8» otherwise — `useBalance`), the split as one bar (you
 * in ink, them in their colour) and the two message counts under its ends. A white card like the others: the
 * person's colour is only in their side of the bar, so the poster above is the page's one lit surface. The counts live here and nowhere
 * else: the conversation table starts with who opens the conversation. Carries `#part-balance`.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()
const { name, answer, headline } = useBalance(() => props.data)

const split = computed(() => {
  const { sent, received } = props.data.report.totals
  const total = sent + received
  if (!total) return null
  return { sent, received }
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
    <div class="split__details">
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
        <i v-if="split.sent" class="split__mine" :style="{ flexGrow: split.sent }" />
        <i v-if="split.received" class="split__theirs" :style="{ flexGrow: split.received }" />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.split__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-block: auto;
}

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
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font: var(--text-label);
}

.split__key::before {
  content: '';
  flex: none;
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--text);
}

.split__key--theirs::before {
  background: var(--them);
}

.split__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
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
