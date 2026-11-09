<script setup lang="ts" generic="T extends string">
/**
 * A filter or a choice of a few values: small text buttons, the chosen one on the selection fill —
 * the way a sidebar marks its row. Replaces segmented controls (there are none in the product).
 */
defineProps<{ options: { value: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="filters" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="filters__item"
      :class="{ 'is-on': model === option.value }"
      :aria-checked="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.filters__item {
  position: relative;
  height: var(--control-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font: var(--text-small-strong);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.filters__item::after {
  content: '';
  position: absolute;
  inset: calc((var(--control-sm) - var(--hit-min)) / 2) 0;
}

.filters__item.is-on {
  background: var(--filters-on, var(--sidebar-selection));
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .filters__item:not(.is-on):hover {
    color: var(--text);
  }
}
</style>
