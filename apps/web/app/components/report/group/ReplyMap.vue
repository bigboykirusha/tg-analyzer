<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'

/**
 * Who answers whom: rows reply, columns are replied to. Shading follows the
 * busiest cell, so the strongest habits stand out in any group size.
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, formatNumber } = useI18n()
const nameOf = useParticipantName()

const map = computed(() => props.group.replyMap)
const people = computed(() => {
  const byId = new Map(props.group.participants.map((participant) => [participant.id, participant]))
  return (map.value?.participantIds ?? []).map((id) => {
    const participant = byId.get(id)
    const name = participant ? nameOf(participant) : t('group.unknownParticipant')
    return { id, name, self: participant?.isSelf ?? false }
  })
})
const peak = computed(() => Math.max(0, ...(map.value?.cells ?? []).flat()))
const hasReplies = computed(() => people.value.length >= 3 && peak.value > 0)

/** 0 for an empty cell, 1–4 by share of the busiest one. */
function level(count: number) {
  if (!count || !peak.value) return 0
  return Math.min(4, Math.ceil((count / peak.value) * 4))
}

/** The person each member answers most, for the line under the map. */
const habits = computed(() =>
  people.value.flatMap((person, row) => {
    const cells = map.value?.cells[row] ?? []
    const best = cells.reduce((top, count, column) => (count > (cells[top] ?? 0) ? column : top), 0)
    const count = cells[best] ?? 0
    return count && best !== row ? [{ from: person, to: people.value[best]!, count }] : []
  }),
)
</script>

<template>
  <div v-if="hasReplies" class="reply-map">
    <div class="reply-map__scroll">
      <table class="grid">
        <caption class="sr-only">
          {{
            t('group.replyMapCaption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" class="grid__corner">
              <span>{{ t('group.replyMapRows') }}</span>
              <span>{{ t('group.replyMapColumns') }}</span>
            </th>
            <th
              v-for="person in people"
              :key="person.id"
              scope="col"
              class="grid__column"
              :class="{ 'is-self': person.self }"
              :title="person.name"
            >
              <span>{{ person.name }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(person, row) in people" :key="person.id">
            <th scope="row" class="grid__row" :class="{ 'is-self': person.self }" :title="person.name">
              {{ person.name }}
            </th>
            <td
              v-for="(column, index) in people"
              :key="column.id"
              class="grid__cell"
              :class="[`grid__cell--l${level(map!.cells[row]?.[index] ?? 0)}`, { 'is-diagonal': index === row }]"
              :aria-label="
                index === row
                  ? undefined
                  : t('group.replyMapCell', {
                      from: person.name,
                      to: column.name,
                      count: formatNumber(map!.cells[row]?.[index] ?? 0),
                    })
              "
            >
              <span v-if="index !== row && (map!.cells[row]?.[index] ?? 0) > 0" class="t-num">
                {{ formatNumber(map!.cells[row]![index]!) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ul v-if="habits.length" class="reply-map__habits">
      <li v-for="habit in habits.slice(0, 4)" :key="habit.from.id">
        {{ t('group.replyMapHabit', { from: habit.from.name, to: habit.to.name, count: formatNumber(habit.count) }) }}
      </li>
    </ul>
  </div>
  <p v-else class="t-small t-muted">{{ t('group.topPairsEmpty') }}</p>
</template>

<style scoped>
.reply-map {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

/* The grid scrolls inside its card on narrow phones; the page never does. */
.reply-map__scroll {
  overflow-x: auto;
  scrollbar-width: thin;
}

/* Phones: tighter cells so most of the matrix is visible without scrolling. */
@media (max-width: 640px) {
  .grid {
    border-spacing: 2px;
  }

  .grid__corner {
    min-width: 72px;
  }

  .grid__row {
    max-width: 72px;
  }

  .grid__cell {
    width: 34px;
    min-width: 32px;
    height: 34px;
  }
}

.grid {
  border-collapse: separate;
  border-spacing: 3px;
  font: var(--text-small);
}

.grid th {
  font-weight: 500;
  white-space: nowrap;
}

.grid__corner {
  display: grid;
  min-width: 96px;
  color: var(--text-muted);
  font: var(--text-caption) !important;
  text-align: left;
  vertical-align: bottom;
}

.grid__column {
  max-width: 64px;
  height: 84px;
  padding: 0;
  vertical-align: bottom;
}

/* Column names run upwards, so eight columns fit a phone. */
.grid__column span {
  display: inline-block;
  max-height: 84px;
  overflow: hidden;
  text-overflow: ellipsis;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.grid__row {
  max-width: 120px;
  padding-right: var(--space-2);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
}

.grid .is-self {
  color: var(--you-ink);
  font-weight: 600;
}

.grid__cell {
  width: 44px;
  min-width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  text-align: center;
}

.grid__cell--l0 {
  background: var(--surface-2);
  color: var(--text-muted);
}

.grid__cell--l1 {
  background: var(--heat-1);
  color: var(--text);
}

.grid__cell--l2 {
  background: var(--heat-2);
  color: var(--text);
}

.grid__cell--l3 {
  background: var(--heat-3);
  color: var(--bg);
}

.grid__cell--l4 {
  background: var(--text);
  color: var(--bg);
}

.grid__cell.is-diagonal {
  background: none;
}

.reply-map__habits {
  display: grid;
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-small);
  list-style: none;
}
</style>
