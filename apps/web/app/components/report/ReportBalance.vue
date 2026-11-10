<script setup lang="ts">
import { isEven, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../../lib/nbsp'

/**
 * «Баланс»: who carries the chat. The answer is one phrase («Пишете на равных») or one figure («×1,8» and
 * who it is for); under it three identical rows, you on the left in ink and the other side on the right in
 * their colour: messages, reply time, who starts the conversation. Parity is `isEven`, the same 1.25 lead
 * as every other two-sided fact; a row without enough behind it is left out.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration, formatPercent } = useI18n()

const name = computed(() => props.data.summary.title)
const report = computed(() => props.data.report)
const totals = computed(() => report.value.totals)

/** How many times more the leader writes, to a tenth («×1,8»); ten and up are whole. */
const times = (ratio: number) => `×${formatNumber(ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10)}`

const lead = computed(() => {
  const { sent, received } = totals.value
  if (!sent && !received) return null
  if (isEven(sent, received)) return { even: true as const }
  const mine = sent > received
  const ratio = Math.max(sent, received) / Math.max(1, Math.min(sent, received))
  return { even: false as const, figure: times(ratio), answer: mine ? t('report.you') : name.value, mine }
})
const answer = computed(() => {
  const item = lead.value
  if (!item) return null
  if (item.even) return t('report.balance.even')
  return item.mine ? t('report.balance.mine') : t('report.balance.theirs', { name: name.value })
})
const figure = computed(() => (lead.value && !lead.value.even ? lead.value.figure : null))

interface Row {
  key: string
  label: string
  mine: number
  theirs: number
  left: string
  right: string
}
const rows = computed<Row[]>(() => {
  const out: Row[] = [
    {
      key: 'messages',
      label: t('report.balance.messages'),
      mine: totals.value.sent,
      theirs: totals.value.received,
      left: formatPercent((totals.value.sent / Math.max(1, totals.value.messages)) * 100),
      right: formatPercent((totals.value.received / Math.max(1, totals.value.messages)) * 100),
    },
  ]
  const { medianMineSec: mineSec, medianTheirsSec: theirsSec, iWriteFirstPct } = report.value.responses
  // The bar of the reply time is the share of speed: the faster side has the longer part.
  if (mineSec && theirsSec)
    out.push({
      key: 'speed',
      label: t('report.balance.speed'),
      mine: 1 / mineSec,
      theirs: 1 / theirsSec,
      left: nbsp(formatDuration(mineSec)),
      right: nbsp(formatDuration(theirsSec)),
    })
  if (iWriteFirstPct !== null && !props.data.derived.habitRows.skipped.includes('starts'))
    out.push({
      key: 'starts',
      label: t('report.balance.starts'),
      mine: iWriteFirstPct,
      theirs: 100 - iWriteFirstPct,
      left: formatPercent(iWriteFirstPct),
      right: formatPercent(100 - iWriteFirstPct),
    })
  return out
})
</script>

<template>
  <ReportSection v-if="answer" id="part-balance" :title="t('report.balance.title')" :figure="figure" :answer="answer">
    <div class="balance">
      <p class="balance__sides t-label" aria-hidden="true">
        <span>{{ t('report.you') }}</span>
        <span class="balance__them">{{ name }}</span>
      </p>
      <div v-for="row in rows" :key="row.key" class="balance__row">
        <p class="t-label">{{ row.label }}</p>
        <ReportLine
          :mine="row.mine"
          :theirs="row.theirs"
          :left="row.left"
          :right="row.right"
          :left-name="t('report.you')"
          :right-name="name"
        />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.balance {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.balance__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.balance__sides > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.balance__them {
  color: var(--them-ink);
}

.balance__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
