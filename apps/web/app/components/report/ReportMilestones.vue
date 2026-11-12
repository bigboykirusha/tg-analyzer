<script setup lang="ts">
import type { MilestoneDto, ReportDto } from '@tg-analyzer/shared'
import { Flag } from '../../lib/icons'

/**
 * «Вехи»: the first message of the chat, the hundredth, the thousandth… as a line of dots — who wrote it,
 * when, and what it was (never its text: only its kind and size). The answer says who began the chat.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDay, formatNumber, formatCountdown } = useI18n()

const name = computed(() => props.data.summary.title)
const milestones = computed(() => props.data.report.milestones ?? [])
const day = (value: string) =>
  formatDay(value.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/u, '')

/** «3 слова», «стикер 😺», «голосовое 0:42»: what the message was, without what it said. */
function kind(item: MilestoneDto): string | null {
  switch (item.kind) {
    case 'text':
      return item.words ? tc('report.milestones.words', item.words, { count: formatNumber(item.words) }) : null
    case 'sticker':
      return t('report.milestones.sticker', { emoji: item.emoji ?? '' }).trim()
    case 'voice':
      return item.durationSec ? t('report.milestones.voice', { duration: formatCountdown(item.durationSec) }) : null
    case 'round':
      return t('report.milestones.round')
    case 'media':
      return t('report.milestones.media')
    case 'file':
      return t('report.milestones.file')
    default:
      return null
  }
}

const items = computed(() =>
  milestones.value.map((item) => ({
    key: item.index,
    title:
      item.index === 1 ? t('report.milestones.first') : t('report.milestones.nth', { n: formatNumber(item.index) }),
    mine: item.mine,
    detail: [item.mine ? t('report.you') : name.value, day(item.at), kind(item)].filter(Boolean).join(' · '),
  })),
)

const answer = computed(() => {
  const first = milestones.value[0]
  if (!first || first.index !== 1) return null
  return first.mine
    ? t('report.milestones.answerMine', { date: day(first.at) })
    : t('report.milestones.answerTheirs', { name: name.value, date: day(first.at) })
})
</script>

<template>
  <ReportSection v-if="answer && items.length > 1" :icon="Flag" :title="t('report.milestones.title')" :answer="answer">
    <ol class="steps">
      <li v-for="item in items" :key="item.key" class="step" :class="{ 'step--mine': item.mine }">
        <span class="step__dot" aria-hidden="true" />
        <span class="t-body step__title">{{ item.title }}</span>
        <span class="t-label step__detail">{{ item.detail }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.steps {
  display: flex;
  flex-direction: column;
}

/* A dot per milestone on one thin line: yours in ink, theirs in their colour. */
.step {
  position: relative;
  display: grid;
  grid-template-columns: var(--space-3) minmax(0, 1fr);
  column-gap: var(--space-3);
  padding-bottom: var(--space-4);
}

.step:last-child {
  padding-bottom: 0;
}

.step::before {
  position: absolute;
  top: var(--space-4);
  bottom: 0;
  left: calc(var(--space-3) / 2);
  width: var(--space-0-5);
  box-shadow: var(--divider-left);
  content: '';
}

.step:last-child::before {
  display: none;
}

.step__dot {
  grid-row: 1;
  align-self: center;
  width: var(--space-3);
  height: var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--them);
}

.step--mine .step__dot {
  background: var(--text);
}

.step__title,
.step__detail {
  grid-column: 2;
  min-width: 0;
}

.step__title {
  grid-row: 1;
}

.step__detail {
  color: var(--text-muted);
}
</style>
