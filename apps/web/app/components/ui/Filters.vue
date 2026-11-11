<script setup lang="ts" generic="T extends string">
/**
 * The one segmented control: a filter or a choice of a few values. Quiet pills in the secondary button's
 * fill, the chosen one in the primary's ink. Filters, view switches and short choices all use it.
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
  display: flex;
  width: fit-content;
  max-width: 100%;
  gap: var(--space-1);
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
  background: var(--btn-fill, var(--fill-control));
  color: var(--btn-fill-text, var(--text));
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
  background: var(--accent);
  color: var(--on-accent);
}

/* The same step as a secondary button; the chosen one stays as it is. */
@media (hover: hover) and (pointer: fine) {
  .segmented__item:not(.is-on):hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

.segmented__item:active:not(.is-on) {
  background-image: linear-gradient(var(--pressed), var(--pressed));
}
</style>
