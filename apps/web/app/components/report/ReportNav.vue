<script setup lang="ts" generic="T extends string">
import type { SegmentedOption } from '../ui/SegmentedControl.vue'

/**
 * The report is one long page; this control, which lives in the header (it is
 * teleported there, so the header is one bar with one blur), jumps to its parts
 * and follows the scroll (scroll-spy). Each part is a `ReportPart` with the id
 * `part-<value>`. Full width on phones.
 */
const props = defineProps<{ options: SegmentedOption<T>[]; label: string }>()
const model = defineModel<T>({ required: true })

/** While a jump scrolls the page, the spy keeps quiet so the thumb does not flicker. */
let jumpingUntil = 0

/** The pinned header, navigation included, is what the page scrolls under. */
function offset() {
  return document.querySelector<HTMLElement>('.app-navigation, .site-header')?.offsetHeight ?? 64
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
  <Teleport to="#header-sub" defer>
    <div class="report-nav no-print">
      <UiSegmentedControl :model-value="model" :options="options" :aria-label="label" @update:model-value="select" />
    </div>
  </Teleport>
</template>

<style scoped>
.report-nav {
  width: 100%;
}

/* Wide screens: a compact control; phones: the full width, one equal slot per part. */
@media (min-width: 641px) {
  .report-nav {
    width: auto;
  }

  .report-nav :deep(.segmented) {
    width: 420px;
  }
}
</style>
