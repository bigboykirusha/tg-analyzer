<script setup lang="ts" generic="T extends string">
export interface SegmentedOption<TValue extends string = string> {
  label: string
  value: TValue
  disabled?: boolean
}

const props = defineProps<{
  modelValue: T
  options: SegmentedOption<T>[]
  /** Required in practice: names the tab list. */
  ariaLabel?: string
  /** Size to content (section headers) instead of the full width. */
  inline?: boolean
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
// Equal-width segments: the thumb is one slot of the track minus the gaps.
const indicatorStyle = computed(() => ({
  '--count': Math.max(props.options.length, 1),
  '--index': activeIndex.value,
}))

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
  <div
    class="segmented"
    :class="{ 'segmented--inline': inline }"
    role="tablist"
    :aria-label="ariaLabel"
    :style="indicatorStyle"
    @keydown="handleKeydown"
  >
    <span v-if="!inline" class="segment-indicator" aria-hidden="true" />
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segment"
      :class="{ 'segment-active': option.value === modelValue }"
      :disabled="option.disabled"
      role="tab"
      :aria-selected="option.value === modelValue"
      :tabindex="option.value === modelValue ? 0 : -1"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  --gap: var(--space-1);
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: var(--gap);
  overflow-x: auto;
  padding: var(--gap);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented--inline {
  display: inline-flex;
  width: auto;
}

.segment-indicator {
  --slot: calc((100% - var(--gap) * (var(--count) + 1)) / var(--count));
  position: absolute;
  z-index: 0;
  top: var(--gap);
  bottom: var(--gap);
  left: calc(var(--gap) + var(--index) * (var(--slot) + var(--gap)));
  width: var(--slot);
  border-radius: var(--radius-full);
  background: var(--thumb);
  box-shadow: var(--shadow-sm);
  transition: left var(--transition-slow);
  pointer-events: none;
}

.segment {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-width: 0;
  min-height: var(--control-sm);
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font: var(--text-control);
  font-weight: 500;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.segmented--inline .segment {
  flex: 0 0 auto;
}

@media (hover: hover) {
  .segment:hover {
    color: var(--text);
  }
}

.segment-active {
  color: var(--text);
  font-weight: 600;
}

/* Inline variant has no sliding thumb: the selected segment carries it. */
.segmented--inline .segment-active {
  background: var(--thumb);
  box-shadow: var(--shadow-sm);
}

.segment:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.segment:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

/* Phones: four tabs must fit 343px without scrolling. */
@media (max-width: 640px) {
  .segment {
    padding-inline: var(--space-1);
    font-size: 13px;
  }
}

@media (max-width: 640px) and (pointer: coarse) {
  .segment {
    min-height: var(--control-md);
  }
}
</style>
