<script setup lang="ts">
import { fillDailyGaps } from '@tg-analyzer/shared'
import { buildExampleReport } from '../../lib/example-report'

/**
 * The example report in miniature, for the product window and the phone on
 * the landing. Built from the same made-up chat as /example, so the numbers
 * on the landing are real output of the app.
 */
const props = defineProps<{ phone?: boolean }>()
const { t, tc, formatNumber, formatDuration, formatPercent, formatPeriod, formatDecimal } = useI18n()

const data = computed(() => buildExampleReport(t('example.partner')))
const totals = computed(() => data.value.report.totals)
const responses = computed(() => data.value.report.responses)
const mine = computed(() => Math.round((totals.value.sent / Math.max(1, totals.value.messages)) * 100))
const firstPct = computed(() => responses.value.iWriteFirstPct ?? 50)
const sent = computed(() => totals.value.sent)
const received = computed(() => totals.value.received)
const days = computed(() => {
  const { firstMessageAt, lastMessageAt } = data.value.summary
  if (!firstMessageAt || !lastMessageAt) return 1
  return Math.max(1, Math.round((Date.parse(lastMessageAt) - Date.parse(firstMessageAt)) / 86_400_000) + 1)
})
const perDay = computed(() => tc('report.fmt.perDay', Math.max(1, Math.round(totals.value.messages / days.value))))
/** The same one-line answer the real report gives under «Кто пишет больше». */
const verdict = computed(() => {
  const text =
    mine.value > 55
      ? t('report.kpi.youWriteMore')
      : mine.value < 45
        ? t('report.kpi.theyWriteMore')
        : t('report.kpi.even')
  return `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`
})
const tabs = computed(() => [t('report.tabs.together'), t('report.tabs.time'), t('report.tabs.words')])
const period = computed(() => formatPeriod(data.value.summary.firstMessageAt, data.value.summary.lastMessageAt, true))
/** Weekly ticks: a day per tick is too fine at this size. */
const weeks = computed(() => {
  const out: { sent: number; received: number }[] = []
  fillDailyGaps(data.value.report.activity.daily).forEach((day, index) => {
    if (index % 7 === 0) out.push({ sent: 0, received: 0 })
    out[out.length - 1]!.sent += day.sent
    out[out.length - 1]!.received += day.received
  })
  return out
})
</script>

<template>
  <div class="mini" :class="{ 'mini--phone': props.phone }" aria-hidden="true">
    <div class="mini__head">
      <UiAvatar :title="data.summary.title" seed="example" :size="props.phone ? 'sm' : 'md'" />
      <div class="mini__who">
        <strong>{{ data.summary.title }}</strong>
        <span>{{ period }}</span>
      </div>
      <span v-if="!props.phone" class="mini__tabs">
        <i v-for="(tab, index) in tabs" :key="tab" :class="{ 'is-on': index === 0 }">{{ tab }}</i>
      </span>
    </div>
    <div class="mini__grid">
      <div class="tile tile--ink mini__wide">
        <div class="tile__label">{{ t('report.kpi.messages') }}</div>
        <div class="tile__figure">{{ formatNumber(totals.messages) }}</div>
        <div class="mini__sentence">{{ perDay }}</div>
        <Seismograph :days="weeks" :height="props.phone ? 40 : 96" />
      </div>
      <div class="tile tile--lime mini__side">
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <strong class="mini__verdict">{{ verdict }}</strong>
        <div class="tile__figure mini__share">
          {{ mine }}<small>/{{ 100 - mine }}</small>
        </div>
        <i class="mini__bar"><b :style="{ flexGrow: sent }" /><b :style="{ flexGrow: received }" /></i>
      </div>
      <div class="tile mini__small">
        <div class="tile__label">{{ t('report.kpi.replyMedian') }}</div>
        <div class="tile__figure">{{ formatDuration(responses.medianMineSec) }}</div>
      </div>
      <div class="tile mini__small">
        <div class="tile__label">{{ t('report.kpi.starts') }}</div>
        <div class="tile__figure">{{ formatPercent(responses.iWriteFirstPct) }}</div>
        <i class="mini__bar"><b :style="{ flexGrow: firstPct }" /><b :style="{ flexGrow: 100 - firstPct }" /></i>
      </div>
      <div v-if="!props.phone" class="tile mini__small">
        <div class="tile__label">{{ t('report.kpi.wordsPerMessage') }}</div>
        <div class="tile__figure">
          {{ totals.textMessages ? formatDecimal(totals.words / totals.textMessages) : t('common.na') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini {
  display: grid;
  gap: var(--space-3);
  pointer-events: none;
  user-select: none;
}

.mini__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mini__who {
  display: grid;
  gap: 4px;
}

.mini__who strong {
  font: 600 24px/1 var(--font-sans);
  letter-spacing: var(--tracking-figure);
}

.mini__who span {
  color: var(--text-muted);
  font: var(--text-caption);
}

.mini__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
}

.mini__wide {
  grid-column: span 8;
}

.mini__side {
  grid-column: span 4;
  justify-content: space-between;
}

.mini__small {
  grid-column: span 4;
}

.mini .tile {
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: 18px;
}

.mini .tile__label {
  font-size: 12px;
}

.mini .tile__figure {
  font-size: 34px;
}

.mini__sentence {
  font: var(--text-small);
  opacity: 0.85;
}

.mini__tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  font: var(--text-caption);
}

.mini__tabs i {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-style: normal;
}

.mini__tabs i.is-on {
  background: var(--surface);
  color: var(--text);
}

.mini__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.mini__bar b {
  border-radius: var(--radius-full);
  background: var(--you);
}

.mini__bar b + b {
  background: var(--them);
}

/* Who writes more: the answer in words, the split as a figure and a bar. */
.mini__verdict {
  font: var(--text-title);
}

.mini__share {
  margin-top: auto;
}

/* Inside the phone: everything a size down, one column with a pair of small tiles. */
.mini--phone {
  gap: var(--space-2);
}

.mini--phone .mini__wide,
.mini--phone .mini__side {
  grid-column: span 12;
}

.mini--phone .mini__small {
  grid-column: span 6;
}

.mini--phone .mini__grid {
  gap: 7px;
}

.mini--phone .tile {
  padding: 12px;
  border-radius: 15px;
}

.mini--phone .tile__label {
  font-size: 10px;
  line-height: 14px;
}

.mini--phone .tile__figure {
  font-size: 26px;
}

.mini--phone .mini__who strong {
  font-size: 19px;
}

.mini--phone .mini__who span {
  font-size: 10px;
}
</style>
