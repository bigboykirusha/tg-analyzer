<script setup lang="ts">
export interface Fact {
  key: string
  label: string
  value: string
  /** A quiet line under the value: «23 апреля», «81 раз против 66». */
  sub?: string | null
  /** The value names the other side: their ink. */
  theirs?: boolean
}

/**
 * Facts as rows of a card: the label on the left, the value on the right, a quiet line under it; a
 * hairline between rows. `columns`: on desktop the facts stand side by side as a ledger instead
 * («Ваши рекорды»).
 */
defineProps<{ facts: Fact[]; columns?: boolean }>()
</script>

<template>
  <dl class="facts" :class="{ 'facts--columns': columns }">
    <div v-for="fact in facts" :key="fact.key" class="fact">
      <dt class="fact__label">{{ fact.label }}</dt>
      <dd class="fact__value" :class="{ 'fact__value--theirs': fact.theirs }">
        {{ fact.value }}
        <span v-if="fact.sub" class="fact__sub">{{ fact.sub }}</span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  display: flex;
  flex-direction: column;
}

.fact {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  box-shadow: var(--divider-bottom);
}

.fact:first-child {
  padding-top: var(--space-1);
}

.fact:last-child {
  padding-bottom: 0;
  box-shadow: none;
}

.fact__label {
  min-width: 0;
  font: var(--text-label);
}

.fact__value {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  max-width: 60%;
  font: var(--text-label);
  text-align: right;
}

.fact__value--theirs {
  color: var(--them-ink);
}

.fact__sub {
  color: var(--text-muted);
  font: var(--text-label);
}

/* Desktop ledger: label, value, the quiet line, in equal columns. */
@media (min-width: 901px) {
  .facts--columns {
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: var(--space-6);
  }

  .facts--columns .fact {
    flex-direction: column;
    gap: var(--space-1);
    padding: 0;
    box-shadow: none;
  }

  .facts--columns .fact__label {
    color: var(--text-muted);
  }

  .facts--columns .fact__value {
    align-items: flex-start;
    max-width: none;
    gap: var(--space-1);
    font: var(--text-body);
    text-align: left;
  }

  .facts--columns .fact__sub {
    font: var(--text-label);
  }
}
</style>
