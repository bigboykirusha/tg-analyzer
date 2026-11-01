<script setup lang="ts">
import { replyComparisonRatio, REPLY_COMPARISON_EVEN_RATIO, type ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

/** Three parts of one long page: how the two of you talk, when, and with which words. */
type Part = 'together' | 'time' | 'words'
const part = ref<Part>('together')
const tabs = computed(() => [
  { value: 'together' as const, label: t('report.tabs.together') },
  { value: 'time' as const, label: t('report.tabs.time') },
  { value: 'words' as const, label: t('report.tabs.words') },
])

const totals = computed(() => props.data.report.totals)
const sentShare = computed(() => (totals.value.messages ? (totals.value.sent / totals.value.messages) * 100 : null))

const responses = computed(() => props.data.report.responses)
const mineShare = computed(() => (sentShare.value === null ? null : Math.round(sentShare.value)))

const shareHint = computed(() => {
  const share = sentShare.value
  if (share === null) return null
  if (share >= 65) return t('report.kpi.youWriteMuchMore')
  if (share > 55) return t('report.kpi.youWriteMore')
  if (share <= 35) return t('report.kpi.theyWriteMuchMore')
  if (share < 45) return t('report.kpi.theyWriteMore')
  return t('report.kpi.even')
})

/** The same window as «When you're usually around» in Activity, so the two never disagree. */
const usually = computed(() => {
  const span = props.data.derived.availabilityProfile.peakWindow
  if (!span) return null
  // «20–23 h»: whole hours are what people say; minutes appear only when present.
  const [from = '', to = ''] = span.split('-').map((time) => time.replace(/:00$/, ''))
  return { window: t('report.kpi.hoursRange', { from, to }) }
})

/** One plain sentence on top: who writes more, who replies faster, when you talk. */
const lead = computed(() => {
  const parts: string[] = []
  const share = sentShare.value
  const name = props.data.summary.title
  if (share !== null)
    parts.push(
      share > 55
        ? t('report.lead.balanceYou')
        : share < 45
          ? t('report.lead.balanceThem', { name })
          : t('report.lead.balanceEven'),
    )
  const mine = responses.value.medianMineSec
  const theirs = responses.value.medianTheirsSec
  const ratio = replyComparisonRatio(responses.value)
  if (ratio !== null && mine !== null && theirs !== null) {
    parts.push(
      ratio < REPLY_COMPARISON_EVEN_RATIO
        ? t('report.lead.replyEven')
        : mine < theirs
          ? t('report.lead.replyYou')
          : t('report.lead.replyThem', { name }),
    )
  }
  if (usually.value) parts.push(t('report.lead.when', { window: usually.value.window }))
  if (!parts.length) return null
  const sentence = parts.join(', ')
  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}.`
})
</script>

<template>
  <div class="stack stack--lg">
    <div v-if="lead || totals.messages < 20" class="report-intro">
      <p v-if="lead" class="report-lead">{{ lead }}</p>
      <p v-if="totals.messages < 20" class="note" role="status">
        <Info aria-hidden="true" />
        {{ t('report.lowData') }}
      </p>
    </div>
    <ReportHero
      :data="data"
      :label="t('report.kpi.messages')"
      :value="formatNumber(totals.messages)"
      :note="tc('story.activeDaysCount', data.report.facts.activeDays)"
    >
      <template #accent>
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <template v-if="mineShare !== null">
          <p v-if="shareHint" class="share__verdict">{{ shareHint }}</p>
          <div class="tile__figure share__figure">
            {{ mineShare }}<small> / {{ 100 - mineShare }}</small>
          </div>
          <dl class="share__sides">
            <div>
              <dt>{{ t('report.you') }}</dt>
              <dd class="t-num">{{ formatNumber(totals.sent) }}</dd>
            </div>
            <div>
              <dt>{{ data.summary.title }}</dt>
              <dd class="t-num">{{ formatNumber(totals.received) }}</dd>
            </div>
          </dl>
        </template>
        <div v-else class="tile__figure">{{ t('common.na') }}</div>
      </template>
    </ReportHero>

    <ReportInsights :data="data" />

    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <ReportPart id="together" :title="t('report.tabs.together')" columns>
      <OverviewTab :data="data" />
      <TalkTab :data="data" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')" columns>
      <TimelineTab :data="data" />
      <RhythmTab :data="data" />
    </ReportPart>
    <ReportPart id="words" :title="t('report.tabs.words')">
      <WordsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
.report-intro {
  display: grid;
  gap: var(--space-2);
}

/* The report in one sentence, before any number. */
.report-lead {
  max-width: 34ch;
  font: 500 clamp(20px, 2.4vw, 26px) / 1.3 var(--font-sans);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

/* Who writes more: the answer in words, the split as a figure, both counts. No bar. */
.share__verdict::first-letter {
  text-transform: uppercase;
}

.share__verdict {
  margin-top: calc(var(--space-1) * -1);
  font: var(--text-h3);
  letter-spacing: -0.02em;
}

.share__figure {
  margin-top: auto;
  font: var(--text-figure-lg);
}

.share__figure small {
  font-size: 0.4em;
}

.share__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--on-lime-line);
}

.share__sides div {
  display: grid;
  min-width: 0;
}

.share__sides dt {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share__sides dd {
  margin: 0;
  font: var(--text-title);
}
</style>
