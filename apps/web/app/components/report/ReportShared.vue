<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Everything the two of you sent, as a till receipt: the period at the top, a line per kind,
 * the total of messages and a barcode drawn from the messages of each month.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDate } = useI18n()

const rows = computed(() => {
  const { report } = props.data
  const sum = (side: { mine: number; theirs: number } | undefined) => (side ? side.mine + side.theirs : 0)
  return [
    { key: 'text', label: t('report.mix.sharedText'), count: chartCount(report.composition.text) },
    { key: 'media', label: t('report.mix.sharedMedia'), count: chartCount(report.composition.media) },
    { key: 'files', label: t('report.mix.sharedFiles'), count: chartCount(report.composition.file) },
    { key: 'voice', label: t('report.mix.sharedVoice'), count: sum(report.voice?.voice.count) },
    { key: 'round', label: t('report.mix.sharedRound'), count: sum(report.voice?.round.count) },
    { key: 'stickers', label: t('report.mix.sharedStickers'), count: sum(report.stickers?.count) },
    { key: 'reactions', label: t('report.mix.sharedReactions'), count: sum(report.reactions?.given) },
  ].filter((row) => row.count > 0)
})

const period = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.data.report.period
  const day = (value: string | null) => formatDate(value, { day: '2-digit', month: '2-digit', year: 'numeric' })
  return firstMessageAt && lastMessageAt ? `${day(firstMessageAt)} — ${day(lastMessageAt)}` : null
})

/** One stripe per month, from thin to thick by its share of the busiest month. */
const barcode = computed(() => {
  const months = props.data.report.activity.monthly
  const max = Math.max(1, ...months.map((month) => month.total))
  return months.map((month) => 1 + Math.round((month.total / max) * 4))
})
</script>

<template>
  <ReportSection v-if="rows.length > 1" :title="t('report.mix.sharedTitle')">
    <div class="receipt t-num">
      <p class="receipt__head">{{ t('report.fmt.receiptHead', { name: data.summary.title }) }}</p>
      <p v-if="period" class="receipt__period">{{ period }}</p>
      <ol class="receipt__rows">
        <li v-for="row in rows" :key="row.key" class="receipt__row">
          <span>{{ row.label }}</span>
          <i aria-hidden="true" />
          <span>{{ formatNumber(row.count) }}</span>
        </li>
      </ol>
      <p class="receipt__row receipt__total">
        <span>{{ t('report.fmt.receiptTotal') }}</span>
        <i aria-hidden="true" />
        <span>{{ formatNumber(data.report.totals.messages) }}</span>
      </p>
      <div v-if="barcode.length > 2" class="receipt__barcode" aria-hidden="true">
        <i v-for="(width, index) in barcode" :key="index" :style="{ width: `${width * 2}px` }" />
      </div>
      <p class="receipt__thanks">{{ t('report.fmt.receiptThanks') }}</p>
    </div>
  </ReportSection>
</template>

<style scoped>
/* Paper on the card: a zig-zag bottom edge, dashed rules, a dotted leader on every line. */
.receipt {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  max-width: 400px;
  margin-inline: auto;
  padding: var(--space-5) var(--space-5) var(--space-8);
  background: var(--surface-2);
  font: var(--text-ui);
  mask:
    linear-gradient(var(--text) 0 0) top / 100% calc(100% - 8px) no-repeat,
    conic-gradient(from -45deg at bottom, transparent, var(--text) 1deg 89deg, transparent 90deg) bottom / 16px 8px
      repeat-x;
}

.receipt__head {
  font: var(--text-title);
  text-align: center;
}

.receipt__period {
  padding-bottom: var(--space-2);
  border-bottom: 1px dashed var(--border-strong);
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}

.receipt__rows {
  display: grid;
  gap: var(--space-1);
  list-style: none;
}

.receipt__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.receipt__row i {
  flex: 1;
  border-bottom: 1px dotted var(--border-strong);
  transform: translateY(-0.25rem);
}

.receipt__total {
  padding-top: var(--space-2);
  border-top: 1px dashed var(--border-strong);
  font-weight: 600;
}

.receipt__barcode {
  display: flex;
  justify-content: center;
  gap: 3px;
  height: 40px;
  margin-top: var(--space-2);
}

.receipt__barcode i {
  background: var(--text);
}

.receipt__thanks {
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}
</style>
