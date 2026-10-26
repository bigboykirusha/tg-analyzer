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
/* An iOS-style segmented control: a grey pill track and a white thumb that slides. */
.segmented {
  --gap: 0px;
  --pad: 3px;
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  gap: var(--gap);
  padding: var(--pad);
  overflow-x: auto;
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
  --slot: calc((100% - 2 * var(--pad)) / var(--count));
  position: absolute;
  z-index: 0;
  top: var(--pad);
  bottom: var(--pad);
  left: calc(var(--pad) + var(--index) * var(--slot));
  width: var(--slot);
  border-radius: var(--radius-full);
  background: var(--segment-thumb);
  box-shadow: var(--shadow-segment);
  transition: left 250ms var(--ease-standard);
  pointer-events: none;
}

.segment {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-width: 0;
  min-height: 30px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font: var(--text-control);
  font-size: 13px;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast),
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
}

/* Inline variant sizes to content, so the selected segment carries its own thumb. */
.segmented--inline .segment-active {
  background: var(--segment-thumb);
  box-shadow: var(--shadow-segment);
}

.segment:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.segment:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .segment {
    padding-inline: var(--space-2);
  }
}

@media (max-width: 640px) and (pointer: coarse) {
  .segment {
    min-height: 36px;
  }
}
</style>
