<script setup lang="ts">
import { fillDailyGaps } from '@tg-analyzer/shared'
import { buildExampleReport } from '../../lib/example-report'
import { hueOf } from '../../lib/hue'

/**
 * The example report in miniature, for the product window and the phone on
 * the landing. Built from the same made-up chat as /example, so the numbers
 * on the landing are real output of the app.
 */
const props = defineProps<{ phone?: boolean }>()
const { t, tc, formatPeriod } = useI18n()

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
const period = computed(() => formatPeriod(data.value.summary.firstMessageAt, data.value.summary.lastMessageAt, true))
const hue = hueOf('example')
/** Every day, as in the report: Seismograph keeps one density everywhere. */
const days = computed(() => fillDailyGaps(data.value.report.activity.daily))
</script>

<template>
  <div class="mini" :class="{ 'mini--phone': props.phone }" :data-hue="hue" aria-hidden="true">
    <div class="mini__poster">
      <strong class="mini__name">{{ data.summary.title }}</strong>
      <span class="mini__meta">{{ tc('common.messagesCount', totals.messages) }}, {{ period }}</span>
      <Seismograph :days="days" :height="props.phone ? 40 : 72" />
    </div>
    <div class="mini__room">
      <div class="tile mini__tile">
        <span class="mini__question">{{ t('report.kpi.whoWritesMore') }}</span>
        <strong class="mini__answer">{{ verdict }}</strong>
        <div class="mini__share t-num">
          <span>{{ mine }}</span
          ><span class="mini__slash">/</span><span class="mini__theirs">{{ 100 - mine }}</span>
        </div>
        <ReportLine :mine="totals.sent" :theirs="totals.received" />
      </div>
      <div v-if="speed && !props.phone" class="tile mini__tile">
        <span class="mini__question">{{ speed.title }}</span>
        <strong class="mini__answer">{{
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
/* The top of a report in miniature: the person's poster, then their room with two white tiles. */
.mini {
  display: grid;
  background: var(--room);
  pointer-events: none;
  user-select: none;
}

.mini__poster {
  --you: var(--on-poster);
  --them: var(--on-poster-muted);
  display: grid;
  gap: var(--space-1);
  padding: var(--space-8) var(--space-8) var(--space-6);
  background: var(--poster);
  color: var(--on-poster);
}

.mini__name {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.mini__meta {
  margin-bottom: var(--space-4);
  color: var(--on-poster-muted);
  font: var(--text-small);
}

.mini__room {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
}

.mini__tile {
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

.mini__question {
  color: var(--text-muted);
  font: var(--text-caption);
}

.mini__answer {
  font: var(--text-title);
  font-weight: 600;
}

.mini__share {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

.mini__slash {
  color: var(--border-strong);
  font-weight: 400;
}

.mini__theirs {
  color: var(--them-ink);
}

/* Inside the phone: one column, a size down. */
.mini--phone .mini__poster {
  padding: var(--space-4) var(--space-4) var(--space-3);
}

.mini--phone .mini__name {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.mini--phone .mini__meta {
  margin-bottom: var(--space-2);
  font: var(--text-caption);
}

.mini--phone .mini__room {
  grid-template-columns: minmax(0, 1fr);
  padding: var(--space-2);
}

.mini--phone .mini__tile {
  padding: var(--space-3);
}

.mini--phone .mini__share {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}
</style>
