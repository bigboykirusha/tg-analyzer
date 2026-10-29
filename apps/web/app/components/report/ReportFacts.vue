<script setup lang="ts">
export interface Fact {
  key: string
  label: string
  value: string
  sub?: string | null
}

withDefaults(defineProps<{ facts: Fact[]; columns?: 1 | 2 | 3 }>(), { columns: 2 })
</script>

<template>
  <div class="facts" :class="`facts--${columns}`">
    <div v-for="fact in facts" :key="fact.key" class="fact">
      <span class="t-label">{{ fact.label }}</span>
      <strong class="fact__value">{{ fact.value }}</strong>
      <span v-if="fact.sub" class="t-small t-muted">{{ fact.sub }}</span>
    </div>
  </div>
</template>

<style scoped>
.facts {
  display: grid;
  gap: var(--space-5) var(--space-6);
}

.facts--1 {
  grid-template-columns: 1fr;
}

.facts--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.facts--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* Ruled like a ledger: a hairline above each fact instead of a grey box. */
.fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.fact__value {
  font: var(--text-h3);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .facts--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact__value {
    font-size: 18px;
    line-height: 24px;
  }
}
</style>
