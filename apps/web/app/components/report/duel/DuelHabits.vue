<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'
import type { Fact } from '../ReportFacts.vue'
import type { MessageKey } from '../../../composables/useI18n'

/**
 * «Ваши привычки»: the small two-sided habits as rows of one card — who starts a conversation, who
 * writes first in the morning, who laughs, who wishes good night and, when the report has no voice
 * lengths for a card of its own, who sends more voice messages. Each row names the side that does it
 * more (or «по очереди», «поровну») with the two counts under it. The answer is who starts.
 * Parity is the same 1.25 lead as every two-sided card (`isEven`).
 */
const props = defineProps<{
  data: ReportDto
  starts: Versus | null
  laughs: Versus | null
  voice: { mine: number; theirs: number } | null
}>()
const { t, tc, formatNumber, formatPercent } = useI18n()

/** Fewer than this many mornings or wishes is noise. */
const MIN = 5
type Side = 'mine' | 'theirs' | 'even'
const sideOf = (mine: number, theirs: number): Side =>
  isEven(mine, theirs) ? 'even' : mine > theirs ? 'mine' : 'theirs'

const name = computed(() => props.data.summary.title)

function fact(key: string, label: string, mine: number, theirs: number, evenWord: string, unit?: string): Fact {
  const side = sideOf(mine, theirs)
  const [high, low] = side === 'theirs' ? [theirs, mine] : [mine, theirs]
  const first = unit ? tc(unit, high) : formatNumber(high)
  return {
    key,
    label,
    value: side === 'even' ? evenWord : side === 'mine' ? t('report.habits.you') : name.value,
    sub: t('report.habits.versus', { first, second: formatNumber(low) }),
    theirs: side === 'theirs',
  }
}

const facts = computed<Fact[]>(() => {
  const out: Fact[] = []
  const turns = t('report.habits.startsEven')
  const even = t('report.habits.even')
  if (props.starts) {
    const [mine, theirs] = [props.starts.pairs[0]!.mine.value, props.starts.pairs[0]!.theirs.value]
    const side = sideOf(mine, theirs)
    const [high, low] = side === 'theirs' ? [theirs, mine] : [mine, theirs]
    out.push({
      key: 'starts',
      label: t('report.habits.starts'),
      value: side === 'even' ? turns : side === 'mine' ? t('report.habits.you') : name.value,
      sub: t('report.habits.versus', { first: formatPercent(high), second: formatPercent(low) }),
      theirs: side === 'theirs',
    })
  }
  const rituals = props.data.report.rituals
  const morning = rituals?.morningFirst
  if (morning && morning.mine + morning.theirs >= MIN)
    out.push(fact('morning', t('report.habits.morning'), morning.mine, morning.theirs, turns, 'report.habits.days'))
  if (props.laughs)
    out.push(
      fact(
        'laughs',
        t('report.habits.laughs'),
        props.laughs.pairs[0]!.mine.value,
        props.laughs.pairs[0]!.theirs.value,
        even,
        'report.habits.times',
      ),
    )
  const night = rituals?.goodNight
  if (night && night.mine + night.theirs >= MIN)
    out.push(fact('night', t('report.habits.night'), night.mine, night.theirs, even, 'report.habits.times'))
  if (props.voice) out.push(fact('voice', t('report.habits.voice'), props.voice.mine, props.voice.theirs, even))
  return out
})

/** «Разговор начинаете по очереди», or the first habit there is. */
const answer = computed(() => {
  const first = facts.value[0]
  if (!first) return null
  const side = first.theirs ? 'theirs' : first.value === t('report.habits.you') ? 'mine' : 'even'
  return t(`report.habits.answer.${first.key}.${side}` as MessageKey, { name: name.value })
})
</script>

<template>
  <ReportSection v-if="facts.length" :title="t('report.habits.title')" :answer="answer">
    <ReportFacts :facts="facts" />
  </ReportSection>
</template>
