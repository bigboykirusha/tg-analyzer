<script setup lang="ts">
import { fillDailyGaps } from '@tg-analyzer/shared'
import { buildExampleReport } from '../../lib/example-report'

/**
 * The example report in miniature, for the product window and the phone on
 * the landing. Built from the same made-up chat as /example, so the numbers
 * on the landing are real output of the app.
 */
const props = defineProps<{ phone?: boolean }>()
const { t, formatNumber, formatPeriod } = useI18n()

const data = computed(() => buildExampleReport(t('example.partner')))
const totals = computed(() => data.value.report.totals)
const mine = computed(() => Math.round((totals.value.sent / Math.max(1, totals.value.messages)) * 100))
/** The same one-line answers the real report gives. */
const verdict = computed(() => {
  const text =
    mine.value > 55
      ? t('report.kpi.youWriteMore')
      : mine.value < 45
        ? t('report.kpi.theyWriteMore', { name: data.value.summary.title })
        : t('report.kpi.even')
  return `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`
})
const versus = useVersus(() => data.value)
const speed = computed(() => versus.value.speed ?? null)
const tabs = computed(() => [t('report.tabs.together'), t('report.tabs.time'), t('report.tabs.words')])
const period = computed(() => formatPeriod(data.value.summary.firstMessageAt, data.value.summary.lastMessageAt, true))
/** Weekly bars, as in the report's top tile. */
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
        <Seismograph :days="weeks" :height="props.phone ? 40 : 72" bars />
      </div>
      <div class="tile tile--lime mini__side">
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <strong class="mini__verdict">{{ verdict }}</strong>
        <div class="tile__figure mini__share">{{ mine }}<span class="mini__slash">/</span>{{ 100 - mine }}</div>
        <ReportLine
          :mine="totals.sent"
          :theirs="totals.received"
          :left="formatNumber(totals.sent)"
          :right="formatNumber(totals.received)"
        />
      </div>
      <div v-if="speed" class="tile mini__full">
        <div class="tile__label">{{ speed.title }}</div>
        <strong class="mini__verdict">{{
          speed.lead ? `${speed.figure} — ${speed.note}` : t('report.fmt.speedEven')
        }}</strong>
        <ReportLine
          :mine="speed.pairs[0]!.mine.value"
          :theirs="speed.pairs[0]!.theirs.value"
          :left="speed.pairs[0]!.mine.text"
          :right="speed.pairs[0]!.theirs.text"
        />
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
  gap: var(--space-1);
}

.mini__who strong {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.mini__who span {
  color: var(--text-muted);
  font: var(--text-caption);
}

.mini__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-3);
}

.mini__wide {
  grid-column: span 8;
}

.mini__side {
  grid-column: span 4;
  justify-content: space-between;
}

.mini__full {
  grid-column: span 12;
}

.mini__slash {
  margin: 0 0.1em;
  color: var(--on-lime-muted);
}

.mini .tile {
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

.mini .tile__label {
  font: var(--text-caption);
}

.mini__tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 2px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  font: var(--text-caption);
}

.mini__tabs i {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-style: normal;
}

.mini__tabs i.is-on {
  background: var(--surface);
  color: var(--text);
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

.mini--phone .mini__grid {
  gap: var(--space-2);
}

.mini--phone .tile {
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.mini--phone .tile__figure {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.mini--phone .mini__who strong {
  font: var(--text-title);
  letter-spacing: 0;
}
</style>
