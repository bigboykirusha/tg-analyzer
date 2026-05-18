<script setup lang="ts" generic="T extends string">
export interface SegmentedOption<TValue extends string = string> {
  label: string
  value: TValue
  disabled?: boolean
}

defineProps<{
  modelValue: T
  options: SegmentedOption<T>[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="segmented" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segment"
      :class="{ 'segment-active': option.value === modelValue }"
      :disabled="option.disabled"
      role="tab"
      :aria-selected="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: var(--space-1);
  overflow-x: auto;
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segment {
  flex: 1 1 0;
  min-height: 38px;
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.segment:hover {
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
}

.segment-active {
  background: var(--accent-subtle);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.segment:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent), 0 0 0 3px var(--bg-base);
}

.segment:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .segmented {
    display: flex;
    width: 100%;
  }

  .segment {
    flex: 0 0 auto;
    min-height: 44px;
  }
}
</style>
