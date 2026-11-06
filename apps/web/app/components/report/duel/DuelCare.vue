<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Moon, Sun } from '../../../lib/icons'

/**
 * «Доброе утро и спокойной ночи»: the care rituals, who wishes more often, both wishes as rows.
 * Fewer than five wishes in all is noise, and the card stays away.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

const MIN_WISHES = 5
const LEAD = 1.25

const view = computed(() => {
  const rituals = props.data.report.rituals
  if (!rituals) return null
  const { goodMorning, goodNight } = rituals
  const mine = goodMorning.mine + goodNight.mine
  const theirs = goodMorning.theirs + goodNight.theirs
  const total = mine + theirs
  if (total < MIN_WISHES) return null
  const vars = {
    count: formatNumber(Math.max(mine, theirs)),
    total: formatNumber(total),
    name: props.data.summary.title,
  }
  const answer =
    Math.max(mine, theirs) < LEAD * Math.min(mine, theirs)
      ? t('report.care.even')
      : mine > theirs
        ? t('report.care.mine', vars)
        : t('report.care.theirs', vars)
  const rows = [
    { key: 'morning', icon: Sun, label: t('report.care.morning'), count: goodMorning },
    { key: 'night', icon: Moon, label: t('report.care.night'), count: goodNight },
  ].filter((row) => row.count.mine + row.count.theirs > 0)
  return { answer, rows }
})
</script>

<template>
  <ReportSection v-if="view" :title="t('report.care.title')" :answer="view.answer">
    <div class="report-rows">
      <div v-for="row in view.rows" :key="row.key" class="report-rows__row">
        <span class="report-rows__label"><component :is="row.icon" aria-hidden="true" />{{ row.label }}</span>
        <ReportLine
          :mine="row.count.mine"
          :theirs="row.count.theirs"
          :left="formatNumber(row.count.mine)"
          :right="formatNumber(row.count.theirs)"
        />
      </div>
    </div>
  </ReportSection>
</template>
