<script setup lang="ts" generic="T extends string">
/**
 * The one segmented control: a filter or a choice of a few values. A neutral pill track (the secondary
 * button's fill), the chosen segment lifted onto the card surface. Filters, view switches and short choices
 * all use it.
 */
defineProps<{ options: { value: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="segmented__item"
      :class="{ 'is-on': model === option.value }"
      :aria-checked="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  max-width: 100%;
  padding: var(--space-0-5);
  border-radius: var(--radius-pill);
  background: var(--btn-fill, var(--surface-2));
  color: var(--btn-fill-text, var(--text));
  overflow-x: auto;
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented__item {
  position: relative;
  flex: none;
  height: var(--control-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  color: var(--text-muted);
  font: var(--text-label);
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.segmented__item::after {
  content: '';
  position: absolute;
  inset: calc((var(--control-sm) - var(--hit-min)) / 2) 0;
}

.segmented__item.is-on {
  background: var(--btn-segment-on, var(--surface));
  color: var(--btn-fill-text, var(--text));
}

@media (hover: hover) and (pointer: fine) {
  .segmented__item:not(.is-on):hover {
    color: var(--btn-fill-text, var(--text));
  }
}
</style>
