<script setup lang="ts">
import { forecastMilestone, type MilestoneDto, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Круглые сообщения»: the 1st, 100th, 1 000th… message of the chat — when, who and what it was
 * (never its text) — and the next round number at the current pace. An ink tile of records,
 * a track on wide screens and a vertical timeline on phones.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDate, formatCountdown } = useI18n()

const name = computed(() => props.data.summary.title)
const ordinal = (index: number) =>
  index === 1 ? t('report.milestones.first') : t('report.milestones.nth', { n: formatNumber(index) })

const lastYear = computed(() => props.data.report.period.lastMessageAt?.slice(0, 4))
const date = (iso: string) =>
  formatDate(iso, {
    day: 'numeric',
    month: 'long',
    ...(iso.slice(0, 4) === lastYear.value ? {} : { year: 'numeric' }),
  })

function what(milestone: MilestoneDto): string {
  const duration = formatCountdown(milestone.durationSec ?? 0)
  switch (milestone.kind) {
    case 'text':
      return milestone.words ? tc('report.milestones.text', milestone.words) : t('report.milestones.textPlain')
    case 'sticker':
      return t('report.milestones.sticker', { emoji: milestone.emoji ?? '' }).trim()
    case 'voice':
      return t('report.milestones.voice', { duration })
    case 'round':
      return t('report.milestones.round', { duration })
    case 'media':
      return t('report.milestones.media')
    case 'file':
      return t('report.milestones.file')
    default:
      return ''
  }
}

/** The first message and the three latest round numbers: a long chat would list ten. */
const reached = computed(() => {
  const all = props.data.report.milestones ?? []
  return all.length > 4 ? [all[0]!, ...all.slice(-3)] : all
})
const forecast = computed(() => forecastMilestone(props.data.report.totals.messages, props.data.report.activity.daily))
const nextDate = computed(() =>
  forecast.value
    ? formatDate(new Date(Date.now() + forecast.value.days * 86_400_000), { day: 'numeric', month: 'long' })
    : '',
)
const answer = computed(() => {
  if (forecast.value) return tc('report.milestones.next', forecast.value.days, { n: ordinal(forecast.value.index) })
  const last = reached.value[reached.value.length - 1]
  return last ? t('report.milestones.last', { n: ordinal(last.index) }) : null
})
/** A chat under a hundred messages with no forecast has nothing round to show. */
const visible = computed(() => reached.value.length > 1 || Boolean(forecast.value && reached.value.length))
</script>

<template>
  <ReportSection v-if="visible" tone="ink" wide :title="t('report.milestones.title')" :answer="answer">
    <ol class="milestones" :style="{ '--milestones': reached.length + (forecast ? 1 : 0) }">
      <li v-for="item in reached" :key="item.index" class="milestone">
        <span class="milestone__dot" aria-hidden="true" />
        <span class="milestone__index t-num">{{ ordinal(item.index) }}</span>
        <span class="milestone__meta">{{ date(item.at) }}</span>
        <span class="milestone__who">
          <ReportSideAvatar :side="item.mine ? 'mine' : 'theirs'" :name="name" />
          {{ item.mine ? t('report.you') : name }}
        </span>
        <span v-if="what(item)" class="milestone__meta">{{ what(item) }}</span>
      </li>
      <li v-if="forecast" class="milestone milestone--next">
        <span class="milestone__dot" aria-hidden="true" />
        <span class="milestone__index t-num">{{ ordinal(forecast.index) }}</span>
        <span class="milestone__meta">{{ t('report.milestones.around', { date: nextDate }) }}</span>
        <span class="milestone__meta">{{ t('report.milestones.pace') }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
/* A hairline track with a dot per milestone; the next one is a dashed ring. */
.milestones {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--milestones), minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: var(--space-2) 0 0;
  list-style: none;
}

.milestones::before {
  position: absolute;
  top: calc(var(--space-2) + 5px);
  right: 0;
  left: 0;
  border-top: 1px solid var(--border);
  content: '';
}

.milestone {
  position: relative;
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  font: var(--text-small);
}

.milestone__dot {
  width: 12px;
  height: 12px;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-full);
  background: var(--them);
}

.milestone--next .milestone__dot {
  border: 1px dashed var(--text-muted);
  background: var(--tile-ink);
}

.milestone__index {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.milestone--next .milestone__index,
.milestone__meta {
  color: var(--text-muted);
}

.milestone__who {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

@media (max-width: 640px) {
  .milestones {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    padding: 0 0 0 var(--space-6);
  }

  .milestones::before {
    top: 6px;
    bottom: 6px;
    left: 5px;
    border-top: 0;
    border-left: 1px solid var(--border);
  }

  .milestone__dot {
    position: absolute;
    top: 8px;
    left: calc(-1 * var(--space-6));
    margin: 0;
  }
}
</style>
