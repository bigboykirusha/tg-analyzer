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
  gap: var(--space-3);
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

.fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.fact__value {
  font: var(--text-h2);
  font-size: 20px;
  line-height: 28px;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .facts--2,
  .facts--3 {
    grid-template-columns: 1fr;
  }
}
</style>
