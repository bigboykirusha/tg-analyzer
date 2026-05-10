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
  display: inline-flex;
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
  transition: background var(--transition-fast), color var(--transition-fast);
}

.segment:hover {
  color: var(--text-primary);
}

.segment-active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
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
    min-height: 44px;
    flex: 0 0 auto;
  }
}
</style>
