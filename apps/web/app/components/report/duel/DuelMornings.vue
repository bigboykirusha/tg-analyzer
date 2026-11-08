<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Утро и вечер» (formerly two cards): who opens the day — the first message of the morning — and
 * who wishes good night, each as a row with its verdict and one plaque, under one answer:
 * «Утро начинаете вы, «спокойной ночи» — от Милы». Fewer than five days or wishes is noise.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

const MIN = 5
/** The same 1.25 lead as every two-sided card (`isEven`). */
const LEAD = 1.25
type Side = 'mine' | 'theirs' | 'even'
const lead = ({ mine, theirs }: { mine: number; theirs: number }): Side =>
  Math.max(mine, theirs) < LEAD * Math.min(mine, theirs) ? 'even' : mine > theirs ? 'mine' : 'theirs'

const view = computed(() => {
  const rituals = props.data.report.rituals
  if (!rituals) return null
  const name = props.data.summary.title
  const first = rituals.morningFirst
  const night = rituals.goodNight
  const morning = first.mine + first.theirs >= MIN ? first : null
  const wishes = night.mine + night.theirs >= MIN ? night : null
  if (!morning && !wishes) return null

  const rows = []
  const parts = []
  if (morning) {
    const side = lead(morning)
    parts.push(t(`report.mornings.answer.morning.${side}`, { name }))
    rows.push({
      key: 'morning',
      label: t('report.dayEdges.morning'),
      verdict: side === 'even' ? t('report.habits.even') : side === 'mine' ? t('report.mornings.you') : name,
      count: morning,
      percent: true,
      theirs: side === 'theirs',
    })
  }
  if (wishes) {
    const side = lead(wishes)
    const total = wishes.mine + wishes.theirs
    const top = Math.max(wishes.mine, wishes.theirs)
    parts.push(t(`report.mornings.answer.night.${side}`, { name }))
    rows.push({
      key: 'night',
      label: t('report.mornings.night'),
      verdict:
        side === 'even'
          ? t('report.habits.even')
          : t('report.mornings.wishes', {
              who: side === 'mine' ? t('report.mornings.you') : name,
              count: formatNumber(top),
              total: formatNumber(total),
            }),
      count: wishes,
      percent: false,
      theirs: side === 'theirs',
    })
  }
  const answer = parts.join(', ')
  return { answer: answer.replace(/^./u, (letter) => letter.toLocaleUpperCase()), rows }
})
</script>

<template>
  <ReportSection v-if="view" :title="t('report.mornings.title')" :answer="view.answer">
    <div class="report-rows">
      <div v-for="row in view.rows" :key="row.key" class="report-rows__row">
        <span class="report-rows__label mornings__label">
          <span>{{ row.label }}</span
          ><strong class="mornings__verdict" :class="{ 'mornings__verdict--theirs': row.theirs }">{{
            row.verdict
          }}</strong>
        </span>
        <ReportLine
          :mine="row.count.mine"
          :theirs="row.count.theirs"
          :left="row.percent ? undefined : formatNumber(row.count.mine)"
          :right="row.percent ? undefined : formatNumber(row.count.theirs)"
        />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.mornings__label {
  justify-content: space-between;
  color: var(--text-muted);
}

.mornings__verdict {
  color: var(--text);
  font-weight: 600;
}

.mornings__verdict--theirs {
  color: var(--them-ink);
}
</style>
