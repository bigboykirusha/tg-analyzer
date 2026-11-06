<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * «Ваши привычки»: the small two-sided habits as rows of one quiet card, each a label with its
 * verdict and one line. Who starts a conversation (shares) and who laughs (counts).
 */
const props = defineProps<{ starts: Versus | null; laughs: Versus | null; theirName: string }>()
const { t } = useI18n()

const verdict = (item: Versus, even: string) =>
  item.lead === 'mine'
    ? t('report.habits.mine')
    : item.lead === 'theirs'
      ? t('report.habits.theirs', { name: props.theirName })
      : even

const rows = computed(() =>
  [
    props.starts && {
      key: 'starts',
      label: t('report.habits.starts'),
      verdict: verdict(props.starts, t('report.habits.startsEven')),
      pair: props.starts.pairs[0]!,
      percent: true,
    },
    props.laughs && {
      key: 'laughs',
      label: t('report.habits.laughs'),
      verdict: verdict(props.laughs, t('report.habits.even')),
      pair: props.laughs.pairs[0]!,
      percent: false,
    },
  ].filter((row): row is NonNullable<typeof row> => Boolean(row)),
)
</script>

<template>
  <ReportSection v-if="rows.length" tone="grey" :title="t('report.habits.title')">
    <div class="report-rows">
      <div v-for="row in rows" :key="row.key" class="report-rows__row">
        <span class="report-rows__label">{{ row.label }} · {{ row.verdict }}</span>
        <ReportLine
          :mine="row.pair.mine.value"
          :theirs="row.pair.theirs.value"
          :left="row.percent ? undefined : row.pair.mine.text"
          :right="row.percent ? undefined : row.pair.theirs.text"
        />
      </div>
    </div>
  </ReportSection>
</template>
