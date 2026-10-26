<script setup lang="ts" generic="T extends string">
import type { SegmentedOption } from '../ui/SegmentedControl.vue'

/**
 * The report's section switcher, pinned under the header. Every screen size
 * swaps the content, so a phone shows one short part at a time instead of one
 * endless page. On narrow screens the bar scrolls sideways.
 */
defineProps<{ options: SegmentedOption<T>[]; label: string }>()
const model = defineModel<T>({ required: true })

const root = ref<HTMLElement | null>(null)

/** Keeps the new tab starting right under the pinned bar. */
function selectTab(value: T) {
  model.value = value
  const bar = root.value
  if (!bar) return
  const top = bar.getBoundingClientRect().top + window.scrollY - topbarHeight()
  if (window.scrollY > top) window.scrollTo({ top })
  nextTick(() => {
    const active = bar.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  })
}

function topbarHeight() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64
}
</script>

<template>
  <div ref="root" class="report-nav no-print">
    <UiSegmentedControl
      inline
      :model-value="model"
      :options="options"
      :aria-label="label"
      @update:model-value="selectTab"
    />
  </div>
</template>

<style scoped>
.report-nav {
  position: sticky;
  top: var(--topbar-height);
  z-index: calc(var(--z-header) - 1);
  margin-inline: calc(var(--page-gutter) * -1);
  padding: var(--space-2) var(--page-gutter);
  overflow-x: auto;
  background: var(--bg);
  scrollbar-width: none;
}

.report-nav::-webkit-scrollbar {
  display: none;
}

.report-nav :deep(.segmented) {
  width: max-content;
}
</style>
