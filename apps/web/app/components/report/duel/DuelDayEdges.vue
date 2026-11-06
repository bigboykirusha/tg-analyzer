<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Moon, Sun } from '../../../lib/icons'

/**
 * «Кто открывает и закрывает день»: who writes first in the morning and who has the last word in
 * the evening, as shares. «Итоги» take the last word from the same `rituals.nightLast`.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

/** Fewer days than this tell nothing about a habit. */
const MIN_DAYS = 5
/** 45–55% is taking turns. */
const EVEN = 5

type Side = 'mine' | 'theirs' | 'even'
type Lead = Exclude<Side, 'even'>
type AnswerKey = 'even' | `both.${Lead}` | `split.${Lead}` | `morning.${Lead}` | `evening.${Lead}`
const lead = (count: { mine: number; theirs: number }): Side => {
  const share = (count.mine / (count.mine + count.theirs)) * 100
  return Math.abs(share - 50) < EVEN ? 'even' : share > 50 ? 'mine' : 'theirs'
}

const view = computed(() => {
  const rituals = props.data.report.rituals
  if (!rituals) return null
  const morning = rituals.morningFirst.mine + rituals.morningFirst.theirs >= MIN_DAYS ? rituals.morningFirst : null
  const evening = rituals.nightLast.mine + rituals.nightLast.theirs >= MIN_DAYS ? rituals.nightLast : null
  if (!morning && !evening) return null
  const name = props.data.summary.title
  const m: Side = morning ? lead(morning) : 'even'
  const e: Side = evening ? lead(evening) : 'even'
  const key: AnswerKey =
    m === 'even' && e === 'even'
      ? 'even'
      : m === e
        ? `both.${m as Lead}`
        : m === 'even'
          ? `evening.${e as Lead}`
          : e === 'even'
            ? `morning.${m}`
            : `split.${m}`
  const rows = [
    morning && { key: 'morning', icon: Sun, label: t('report.dayEdges.morning'), count: morning },
    evening && { key: 'evening', icon: Moon, label: t('report.dayEdges.evening'), count: evening },
  ].filter((row): row is NonNullable<typeof row> => Boolean(row))
  return { answer: t(`report.dayEdges.answer.${key}`, { name }), rows }
})
</script>

<template>
  <ReportSection v-if="view" :title="t('report.dayEdges.title')" :answer="view.answer">
    <div class="report-rows">
      <div v-for="row in view.rows" :key="row.key" class="report-rows__row">
        <span class="report-rows__label"><component :is="row.icon" aria-hidden="true" />{{ row.label }}</span>
        <ReportLine :mine="row.count.mine" :theirs="row.count.theirs" />
      </div>
    </div>
  </ReportSection>
</template>
