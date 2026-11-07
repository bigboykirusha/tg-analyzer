<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * «Ваши привычки»: the small two-sided habits as rows of one quiet card, each a label with its
 * verdict and one line. Who starts a conversation (shares), who laughs (counts) and, when the
 * report has no voice lengths for a card of its own, who sends more voice messages (counts).
 */
const props = defineProps<{
  starts: Versus | null
  laughs: Versus | null
  voice: { mine: number; theirs: number } | null
  theirName: string
}>()
const { t, formatNumber } = useI18n()

/** The same 1.25 lead as the other two-sided cards. */
const LEAD = 1.25
const voiceVerdict = (mine: number, theirs: number) =>
  Math.max(mine, theirs) < LEAD * Math.min(mine, theirs)
    ? t('report.habits.even')
    : mine > theirs
      ? t('report.habits.mine')
      : t('report.habits.theirs', { name: props.theirName })

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
    props.voice && {
      key: 'voice',
      label: t('report.habits.voice'),
      verdict: voiceVerdict(props.voice.mine, props.voice.theirs),
      pair: {
        mine: { value: props.voice.mine, text: formatNumber(props.voice.mine) },
        theirs: { value: props.voice.theirs, text: formatNumber(props.voice.theirs) },
      },
      percent: false,
    },
  ].filter((row): row is NonNullable<typeof row> => Boolean(row)),
)
</script>

<template>
  <ReportSection v-if="rows.length" :title="t('report.habits.title')">
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
