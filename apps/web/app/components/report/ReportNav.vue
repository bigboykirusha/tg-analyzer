<script setup lang="ts" generic="T extends string">
import type { SegmentedOption } from '../ui/SegmentedControl.vue'

/**
 * The report is one long page; this bar, pinned under the header, jumps to its
 * parts and follows the scroll (scroll-spy). Each part is a `ReportPart` with
 * the id `part-<value>`. Full width on phones.
 */
const props = defineProps<{ options: SegmentedOption<T>[]; label: string }>()
const model = defineModel<T>({ required: true })

const root = ref<HTMLElement | null>(null)
/** While a jump scrolls the page, the spy keeps quiet so the thumb does not flicker. */
let jumpingUntil = 0

function offset() {
  const topbar = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64
  return topbar + (root.value?.offsetHeight ?? 0)
}

function select(value: T) {
  model.value = value
  const part = document.getElementById(`part-${value}`)
  if (!part) return
  jumpingUntil = Date.now() + 900
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: part.getBoundingClientRect().top + window.scrollY - offset() + 1,
    behavior: reduce ? 'auto' : 'smooth',
  })
}

function spy() {
  if (Date.now() < jumpingUntil) return
  const line = offset() + 8
  let current = props.options[0]?.value
  for (const option of props.options) {
    const part = document.getElementById(`part-${option.value}`)
    if (part && part.getBoundingClientRect().top <= line) current = option.value
  }
  // At the very bottom the last part may be too short to reach the line.
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
    current = props.options.at(-1)?.value
  if (current && current !== model.value) model.value = current
}

onMounted(() => {
  window.addEventListener('scroll', spy, { passive: true })
  spy()
})
onBeforeUnmount(() => window.removeEventListener('scroll', spy))
</script>

<template>
  <div ref="root" class="report-nav no-print">
    <UiSegmentedControl :model-value="model" :options="options" :aria-label="label" @update:model-value="select" />
  </div>
</template>

<style scoped>
.report-nav {
  position: sticky;
  top: var(--topbar-height);
  z-index: calc(var(--z-header) - 1);
  margin-inline: calc(var(--page-gutter) * -1);
  padding: var(--space-2) var(--page-gutter);
  background: var(--bg);
}

/* Wide screens: a compact bar; phones: the full width, one equal slot per part. */
@media (min-width: 641px) {
  .report-nav :deep(.segmented) {
    max-width: 420px;
  }
}
</style>
