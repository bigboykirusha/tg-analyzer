<script setup lang="ts">
import { formatVoiceDuration, type HabitId, type HabitRow, type ReportDto } from '@tg-analyzer/shared'
import type { MessageKey } from '../../composables/useI18n'

/**
 * «Привычки»: where the two of you differ. The answer is the brightest difference as one figure
 * («×3,2» — «Вы спрашиваете»); under it the other leads as identical rows — the side's name in its own
 * colour, the action, how many times more. Habits where nobody leads go into one quiet line. «Кто
 * начинает» is a row of «Баланс», so it is not repeated here. The numbers are `derived.habitRows`,
 * already thinned by the significance floors: a thin habit never shows up.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, locale, formatNumber } = useI18n()

const name = computed(() => props.data.summary.title)
/** Most rows a card keeps besides its answer. */
const MAX_ROWS = 4

const leads = computed(() => props.data.derived.habitRows.leads.filter((row) => row.id !== 'starts'))
const even = computed(() => props.data.derived.habitRows.even.filter((id) => id !== 'starts'))
const brightest = computed<HabitRow | null>(() => leads.value[0] ?? null)
const rows = computed(() => leads.value.slice(1, 1 + MAX_ROWS))

const who = (row: HabitRow) => (row.lead === 'mine' ? t('report.you') : name.value)
const action = (row: HabitRow) => t(`report.habit.${row.id}.${row.lead}` as MessageKey)
/** «×3,2»; a side that does it alone has no ratio, so no figure either. */
const times = (row: HabitRow) =>
  row.ratio === null ? null : `×${formatNumber(row.ratio >= 10 ? Math.round(row.ratio) : row.ratio)}`

const answer = computed(() => (brightest.value ? `${who(brightest.value)} ${action(brightest.value)}` : null))
const evenLine = computed(() =>
  even.value.length
    ? t('report.habit.even', { list: even.value.map((id) => t(`report.habit.${id}.noun` as MessageKey)).join(', ') })
    : null,
)

/** Voice messages and video notes together, when there are enough of them to be a habit. */
const voiceTime = computed(() => {
  const row = props.data.derived.habitRows.leads.find((item: HabitRow) => item.id === ('voice' satisfies HabitId))
  return row?.seconds && row.seconds >= 60
    ? t('report.habit.voiceTotal', { time: formatVoiceDuration(row.seconds, locale.value) })
    : null
})
</script>

<template>
  <ReportSection
    v-if="brightest"
    id="part-habits"
    :title="t('report.habit.title')"
    :figure="times(brightest)"
    :answer="answer"
  >
    <ul v-if="rows.length" class="habits">
      <li v-for="row in rows" :key="row.id" class="habits__row t-body">
        <span class="habits__who t-label" :class="{ 'habits__who--them': row.lead === 'theirs' }">{{ who(row) }}</span>
        <span class="habits__action">{{ action(row) }}</span>
        <span v-if="times(row)" class="habits__times t-label">{{ times(row) }}</span>
      </li>
    </ul>
    <template v-if="evenLine || voiceTime" #note>
      {{ [evenLine, voiceTime].filter(Boolean).join('. ') }}
    </template>
  </ReportSection>
</template>

<style scoped>
.habits {
  display: flex;
  flex-direction: column;
}

.habits__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  box-shadow: var(--divider-top);
}

.habits__who {
  flex: none;
  min-width: var(--space-16);
  max-width: 33%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.habits__who--them {
  color: var(--them-ink);
}

.habits__action {
  flex: 1;
  min-width: 0;
}

.habits__times {
  flex: none;
  color: var(--text-muted);
}
</style>
