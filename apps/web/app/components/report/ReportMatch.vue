<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Users } from '../../lib/icons'

/**
 * «Вы и {имя}»: everything the two of you can be compared in, as one sheet — a match's statistics. You on the
 * left in ink, the other side on the right in their colour; each row the two values, what they are of, and two
 * bars from the middle out. A scoreboard first (how many rows each side leads); only the rows with a leader get
 * bars, grouped by topic; the even ones fold into one line of names. When most rows are even a score of «1 : 1»
 * says nothing, so the scoreboard gives way to one figure — «Поровну в 11 из 13» — and a line of who leads where.
 * The rows, the tally and the answer come from `useMatch`, so the card and the verdict under the poster agree.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const { rows, decisive, tally, evenNames, answer, mostlyEven, leads } = useMatch(() => props.data)
const name = computed(() => props.data.summary.title)

/** «Вы — впереди: вопросы» · «Мила — впереди: смех»: only the rows that score, one phrase a side. */
const leadLine = computed(() =>
  (['mine', 'theirs'] as const)
    .map((who) => {
      const labels = leads.value.filter((item) => item.scored && item.lead === who).map((item) => item.label)
      return labels.length
        ? {
            who,
            text: t('report.match.leads', {
              who: who === 'mine' ? t('report.you') : name.value,
              labels: labels.join(', ').toLocaleLowerCase(),
            }),
          }
        : null
    })
    .filter((item): item is { who: 'mine' | 'theirs'; text: string } => item !== null),
)
</script>

<template>
  <ReportSection v-if="answer" id="part-match" wide :icon="Users" :title="t('report.match.title')" :answer="answer">
    <div class="sheet">
      <div v-if="mostlyEven" class="mostly">
        <p class="t-figure">{{ t('report.match.evenFigure', { even: tally.even, total: rows.length }) }}</p>
        <p v-if="leadLine.length" class="t-label mostly__leads">
          <template v-for="(item, index) in leadLine" :key="item.who">
            <template v-if="index"> · </template>
            <span :class="{ mostly__theirs: item.who === 'theirs' }">{{ item.text }}</span>
          </template>
        </p>
      </div>
      <div v-else class="score">
        <p class="score__side">
          <span class="t-figure score__figure">{{ tally.mine }}</span>
          <span class="t-label score__name">{{ t('report.you') }}</span>
        </p>
        <p class="t-label score__even">{{ t('report.match.evenCount', { count: tally.even }) }}</p>
        <p class="score__side score__side--theirs">
          <span class="t-figure score__figure score__figure--theirs">{{ tally.theirs }}</span>
          <span class="t-label score__name score__name--theirs">{{ name }}</span>
        </p>
      </div>
      <section v-for="group in decisive" :key="group.key" class="sheet__group" :aria-label="group.title">
        <h4 class="t-label sheet__title">{{ group.title }}</h4>
        <div v-for="item in group.rows" :key="item.key" class="vs">
          <span class="t-body vs__value" :class="{ 'vs__value--behind': item.lead === 'theirs' }">{{ item.mine }}</span>
          <span class="t-label vs__label">{{ item.label }}</span>
          <span class="t-body vs__value vs__value--theirs" :class="{ 'vs__value--behind': item.lead === 'mine' }">
            {{ item.theirs }}
          </span>
          <span class="vs__bars" aria-hidden="true">
            <span class="vs__track vs__track--mine"><i :style="{ width: `${item.shareMine}%` }" /></span>
            <span class="vs__track"><i :style="{ width: `${100 - item.shareMine}%` }" /></span>
          </span>
        </div>
      </section>
      <p v-if="tally.even" class="t-label sheet__even">{{ t('report.match.evenList', { names: evenNames }) }}</p>
    </div>
  </ReportSection>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* An even chat: one figure and, quietly under it, where someone is ahead. */
.mostly {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.mostly__theirs {
  color: var(--them-ink);
}

.mostly__leads {
  color: var(--text-muted);
  text-wrap: pretty;
}

/* The scoreboard: how many comparisons each side leads, the even ones quietly between. */
.score {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: var(--space-3);
}

.score__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.score__side--theirs {
  align-items: flex-end;
  text-align: right;
}

.score__figure--theirs,
.score__name--theirs {
  color: var(--them-ink);
}

.score__name {
  color: var(--text-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score__name--theirs {
  color: var(--them-ink);
}

.score__even {
  color: var(--text-muted);
  text-align: center;
  white-space: nowrap;
}

.sheet__even {
  color: var(--text-muted);
  text-wrap: pretty;
}

.sheet__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sheet__title {
  color: var(--text-muted);
}

/* One comparison: the two values at the edges, what they are of in the middle, two bars growing from the middle. */
.vs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
}

.vs__label {
  color: var(--text-muted);
  text-align: center;
}

.vs__value--theirs {
  text-align: right;
}

/* The side that is behind steps back: the leader reads first. */
.vs__value--behind {
  color: var(--text-muted);
}

.vs__bars {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-0-5);
}

.vs__track {
  display: flex;
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--room-tint);
  overflow: hidden;
}

.vs__track--mine {
  justify-content: flex-end;
}

.vs__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--them);
}

.vs__track--mine i {
  background: var(--text);
}
</style>
