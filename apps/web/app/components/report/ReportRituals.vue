<script setup lang="ts">
import { isEven, MIN_GOOD_NIGHTS, MIN_MORNINGS, ratioStep, type ReportDto } from '@tg-analyzer/shared'
import { Sun } from '../../lib/icons'

/**
 * «Утро и ночь»: who opens the mornings and who has the last word of the evening, and who says «доброе утро» and
 * «спокойной ночи» — the rows that used to stand in «Кто кого» under their own heading. They tell the day, so they
 * live in «Время». Told in words, never as a multiplier: «чуть чаще», «вдвое чаще», «только вы»; a tie is «поровну».
 * A section is drawn only with enough mornings (`MIN_MORNINGS`) or wishes (`MIN_GOOD_NIGHTS`) behind it.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()
const name = computed(() => props.data.summary.title)

type Side = 'mine' | 'theirs'
interface Line {
  key: string
  label: string
  mine: number
  theirs: number
  lead: Side | null
  /** «вдвое чаще», «только вы»; empty on a tie (the tag says «поровну»). */
  words: string
  /** Only one side does it at all: «только вы» says who by itself, with no «Вы — » in front. */
  only: boolean
  /** The «из N утр» of the sample, shown quietly beside the label. */
  of?: string
}

/** The ratio, in words: the steps live in shared (`ratioStep`), with their tests. */
const ratioWords = (ratio: number) => t(`report.rituals.ratio.${ratioStep(ratio)}`)

function line(key: string, label: string, mine: number, theirs: number, of?: string): Line {
  const lead: Side | null = isEven(mine, theirs) ? null : mine > theirs ? 'mine' : 'theirs'
  let words = ''
  let only = false
  if (lead) {
    const low = Math.min(mine, theirs)
    only = low === 0
    words = low
      ? ratioWords(Math.max(mine, theirs) / low)
      : t('report.rituals.only', { who: lead === 'mine' ? t('report.you').toLocaleLowerCase() : name.value })
  }
  return { key, label, mine, theirs, lead, words, only, of }
}

const rituals = computed(() => props.data.report.rituals)

const morning = computed(() => {
  const data = rituals.value
  if (!data || data.mornings < MIN_MORNINGS) return null
  const lines = [
    line(
      'first',
      t('report.habits.morning'),
      data.morningFirst.mine,
      data.morningFirst.theirs,
      t('report.rituals.of', { count: formatNumber(data.mornings) }),
    ),
    data.goodMorning.mine + data.goodMorning.theirs >= MIN_GOOD_NIGHTS
      ? line('hello', t('report.match.goodMorning'), data.goodMorning.mine, data.goodMorning.theirs)
      : null,
  ].filter((item): item is Line => item !== null)
  return { title: t('report.rituals.morning'), lines }
})

const evening = computed(() => {
  const data = rituals.value
  if (!data) return null
  const lines = [
    data.evenings >= MIN_MORNINGS
      ? line(
          'last',
          t('report.rituals.lastWord'),
          data.nightLast.mine,
          data.nightLast.theirs,
          t('report.rituals.of', { count: formatNumber(data.evenings) }),
        )
      : null,
    data.goodNight.mine + data.goodNight.theirs >= MIN_GOOD_NIGHTS
      ? line('night', t('report.match.goodNight'), data.goodNight.mine, data.goodNight.theirs)
      : null,
  ].filter((item): item is Line => item !== null)
  return lines.length ? { title: t('report.rituals.evening'), lines } : null
})

/**
 * Who leads a section: its first line says it (who writes first in the morning, who has the last word at night) —
 * the very line under the answer, so the answer never says «вы» over a line that says «поровну».
 */
const leader = (lines: Line[] | undefined): Side | 'even' | null => {
  if (!lines?.length) return null
  return lines[0]!.lead ?? 'even'
}

const answer = computed(() => {
  const parts: string[] = []
  const first = leader(morning.value?.lines)
  if (first) parts.push(t(`report.rituals.morningAnswer.${first}`, { name: name.value }))
  const second = leader(evening.value?.lines)
  if (second) parts.push(t(`report.rituals.eveningAnswer.${second}`, { name: name.value }))
  const text = parts.join(', ')
  // The evening alone opens the answer: it starts with a capital in the tree too, not only on screen.
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
})

const sections = computed(() => [morning.value, evening.value].filter((item) => item !== null))
</script>

<template>
  <ReportSection
    v-if="sections.length && answer"
    id="part-rituals"
    wide
    :icon="Sun"
    :title="t('report.match.group.day')"
    :answer="answer"
  >
    <div class="rituals">
      <section v-for="section in sections" :key="section.title" class="rituals__section">
        <h4 class="t-label rituals__head">{{ section.title }}</h4>
        <div v-for="item in section.lines" :key="item.key" class="ritual">
          <p class="ritual__label t-body">
            <span
              >{{ item.label
              }}<template v-if="item.of"
                >{{ ' ' }}<span class="t-label ritual__of">{{ item.of }}</span></template
              ></span
            >
            <b
              class="t-label"
              :class="{ 'ritual__tag--theirs': item.lead === 'theirs', 'ritual__tag--even': !item.lead }"
            >
              <template v-if="!item.lead">{{ t('report.duel.evenFigure') }}</template>
              <template v-else-if="item.only">{{ item.words }}</template>
              <template v-else-if="item.lead === 'mine'">{{ t('report.you') }} — {{ item.words }}</template>
              <template v-else>{{ name }} — {{ item.words }}</template>
            </b>
          </p>
          <div class="ritual__bar" aria-hidden="true">
            <i v-if="item.mine" class="ritual__mine" :style="{ flexGrow: item.mine }" />
            <i v-if="item.theirs" class="ritual__theirs" :style="{ flexGrow: item.theirs }" />
          </div>
          <p class="ritual__counts t-label">
            <span :class="{ 'is-lead': item.lead === 'mine' }">{{ formatNumber(item.mine) }}</span>
            <span :class="{ 'is-lead': item.lead === 'theirs' }">{{ formatNumber(item.theirs) }}</span>
          </p>
        </div>
      </section>
    </div>
  </ReportSection>
</template>

<style scoped>
.rituals {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

@media (min-width: 901px) {
  .rituals:has(.rituals__section + .rituals__section) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-6);
  }
}

.rituals__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  box-shadow: var(--divider-top);
}

.rituals__head {
  color: var(--text-muted);
}

.ritual {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.ritual__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

/* The verdict is a label (500 by its role), not a bold <b> and not the body's 400. */
.ritual__label b {
  flex: 0 1 45%;
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.ritual__of {
  color: var(--text-muted);
}

.ritual__tag--theirs {
  color: var(--them-ink);
}

.ritual__tag--even {
  color: var(--text-muted);
}

/* You in ink, the other side in their colour, as every two-sided bar of the report. */
.ritual__bar {
  display: flex;
  gap: var(--space-0-5);
  height: var(--space-3);
}

.ritual__bar i {
  flex-basis: 0;
  min-width: var(--space-2);
  border-radius: var(--radius-pill);
}

.ritual__mine {
  background: var(--text);
}

.ritual__theirs {
  background: var(--them);
}

.ritual__counts {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
}

.ritual__counts .is-lead {
  color: var(--text);
}
</style>
