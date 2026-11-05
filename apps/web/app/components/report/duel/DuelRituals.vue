<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Mornings and evenings: the most telling fact of the day's edges as the answer, both counts at
 * the foot, the rest in plain lines. Counts are the same as in «Итоги».
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const name = computed(() => props.data.summary.title)

/** Below this many «спокойной ночи» the evenings tell more than the phrase. */
const MIN_PHRASES = 5
const MIN_DAYS = 5

const view = computed(() => {
  const rituals = props.data.report.rituals
  if (!rituals) return null
  const { goodNight, nightLast, morningFirst } = rituals
  const vars = { name: name.value }
  const lines: string[] = []

  const evenings = nightLast.mine + nightLast.theirs
  const lastShare = evenings ? (nightLast.mine / evenings) * 100 : null
  const evening =
    lastShare === null || evenings < MIN_DAYS
      ? null
      : Math.abs(lastShare - 50) < 5
        ? t('report.fmt.eveningEven')
        : lastShare > 50
          ? t('report.fmt.eveningMine', { pct: formatPercent(lastShare) })
          : t('report.fmt.eveningTheirs', { ...vars, pct: formatPercent(100 - lastShare) })

  const mornings = morningFirst.mine + morningFirst.theirs
  const morning =
    mornings < MIN_DAYS
      ? null
      : t(
          morningFirst.mine === morningFirst.theirs
            ? 'report.fmt.morningEven'
            : morningFirst.mine > morningFirst.theirs
              ? 'report.fmt.morningMine'
              : 'report.fmt.morningTheirs',
          { ...vars, mine: formatNumber(morningFirst.mine), theirs: formatNumber(morningFirst.theirs) },
        )

  const nights = goodNight.mine + goodNight.theirs
  if (nights >= MIN_PHRASES) {
    const theirsLead = goodNight.theirs > goodNight.mine
    if (evening) lines.push(evening)
    if (morning) lines.push(morning)
    return {
      answer: theirsLead
        ? t('report.fmt.goodNightTheirs', { count: formatNumber(goodNight.theirs) })
        : t('report.fmt.goodNightMine', { count: formatNumber(goodNight.mine) }),
      sides: { mine: formatNumber(goodNight.mine), theirs: formatNumber(goodNight.theirs), name: name.value },
      lines,
    }
  }
  if (lastShare === null || evenings < MIN_DAYS) return null
  if (morning) lines.push(morning)
  const mineLead = lastShare >= 50
  return {
    answer: mineLead
      ? t('report.fmt.lastWordMine', { pct: formatPercent(lastShare) })
      : t('report.fmt.lastWordTheirs', { ...vars, pct: formatPercent(100 - lastShare) }),
    sides: {
      mine: formatPercent(lastShare),
      theirs: formatPercent(100 - lastShare),
      name: name.value,
    },
    lines,
  }
})
</script>

<template>
  <ReportSection v-if="view" :title="t('report.fmt.ritualsTitle')" :answer="view.answer" :sides="view.sides">
    <ul v-if="view.lines.length" class="lines">
      <li v-for="line in view.lines" :key="line">{{ line }}</li>
    </ul>
  </ReportSection>
</template>

<style scoped>
.lines {
  display: grid;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
  list-style: none;
}
</style>
