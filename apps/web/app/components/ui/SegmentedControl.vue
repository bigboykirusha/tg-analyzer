<script setup lang="ts" generic="T extends string">
export interface SegmentedOption<TValue extends string = string> {
  label: string
  value: TValue
  disabled?: boolean
}

const props = defineProps<{
  modelValue: T
  options: SegmentedOption<T>[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const activeIndex = computed(() =>
  Math.max(
    0,
    props.options.findIndex((option) => option.value === props.modelValue),
  ),
)
const indicatorStyle = computed(() => {
  const count = Math.max(props.options.length, 1)
  const index = activeIndex.value
  return {
    '--segment-width': `calc(${100 / count}% - ${4 + 4 / count}px)`,
    '--segment-left': `calc(${(index * 100) / count}% + ${4 - (index * 4) / count}px)`,
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const root = event.currentTarget as HTMLElement
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  if (!buttons.length) return
  event.preventDefault()
  const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement))
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
  buttons[nextIndex]?.focus()
  buttons[nextIndex]?.click()
}
</script>

<template>
  <div class="segmented" role="tablist" :aria-label="ariaLabel" :style="indicatorStyle" @keydown="handleKeydown">
    <span class="segment-indicator" aria-hidden="true" />
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
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: var(--space-1);
  overflow-x: auto;
  padding: var(--space-1);
  border: 0;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  scrollbar-width: none;
}

.segment-indicator {
  position: absolute;
  z-index: 0;
  top: var(--space-1);
  bottom: var(--space-1);
  left: var(--segment-left);
  width: var(--segment-width);
  border: 1px solid color-mix(in srgb, var(--glass-border) 72%, transparent);
  border-radius: var(--radius-full);
  background: var(--surface);
  box-shadow: var(--glass-inset), var(--shadow);
  transition:
    left var(--transition-slow),
    background var(--transition-normal),
    box-shadow var(--transition-normal);
  pointer-events: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segment {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-height: 38px;
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
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
  background: color-mix(in srgb, var(--surface) 58%, transparent);
  color: var(--text);
}

.segment-active {
  background: transparent;
  color: var(--text);
  box-shadow: none;
}

.segment:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--accent),
    0 0 0 3px var(--bg);
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
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    padding-inline: var(--space-2);
  }
}
</style>
