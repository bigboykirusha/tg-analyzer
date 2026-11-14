<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Trophy } from '../../lib/icons'

/**
 * «Ваши рекорды» as big numbers, two to a row: the longest conversation, the busiest day, the longest pause
 * (who broke it), how many conversations there were and, when it is shorter than the whole chat, the longest
 * run of days. The answer names the day of records when the longest conversation and the busiest day fell on
 * one date; otherwise it is the first record, which then leaves the grid.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const { facts, answer, tiles } = useRecords(() => props.data)
</script>

<template>
  <ReportSection v-if="facts.length" :icon="Trophy" :title="t('report.fmt.recordsTitle')" :answer="answer">
    <ReportTiles v-if="tiles.length" :tiles="tiles" />
  </ReportSection>
</template>
