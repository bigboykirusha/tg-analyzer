<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Mornings and evenings as one fact in large type, Wrapped-style: the most telling number of
 * the day's edges, then the rest in plain sentences. Counts are the same as in «Итоги».
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
      label: t('report.fmt.goodNightLabel'),
      figure: formatNumber(Math.max(goodNight.mine, goodNight.theirs)),
      sentence: theirsLead
        ? t('report.fmt.goodNightTheirs', { ...vars, other: formatNumber(goodNight.mine) })
        : t('report.fmt.goodNightMine', { ...vars, other: formatNumber(goodNight.theirs) }),
      lines,
    }
  }
  if (lastShare === null || evenings < MIN_DAYS) return null
  if (morning) lines.push(morning)
  const mineLead = lastShare >= 50
  return {
    label: t('report.fmt.lastWordLabel'),
    figure: formatPercent(mineLead ? lastShare : 100 - lastShare),
    sentence: mineLead ? t('report.fmt.lastWordMine') : t('report.fmt.lastWordTheirs', vars),
    lines,
  }
})
</script>

<template>
  <ReportSection v-if="view" :title="t('report.fmt.ritualsTitle')">
    <div class="fact">
      <span class="fact__label">{{ view.label }}</span>
      <p class="fact__figure t-num">{{ view.figure }}</p>
      <p class="fact__sentence">{{ view.sentence }}</p>
    </div>
    <ul class="lines">
      <li v-for="line in view.lines" :key="line">{{ line }}</li>
    </ul>
  </ReportSection>
</template>

<style scoped>
.fact {
  display: grid;
  gap: var(--space-2);
}

.fact__label {
  color: var(--text-muted);
  font: var(--text-label);
}

.fact__figure {
  font: var(--text-figure-lg);
  letter-spacing: -0.04em;
}

.fact__sentence {
  font: var(--text-lede);
  font-weight: 500;
}

.lines {
  display: grid;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
  list-style: none;
}
</style>
