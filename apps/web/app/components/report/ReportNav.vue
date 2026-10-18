<script setup lang="ts" generic="T extends string">
import type { SegmentedOption } from '../ui/SegmentedControl.vue'

/**
 * The report's section switcher, pinned under the header.
 * Wide screens: tabs that swap the content. Phones (`scroll`): every part is on
 * one page, so the chips jump to a part and follow the scroll position.
 */
const props = defineProps<{ options: SegmentedOption<T>[]; label: string; scroll: boolean }>()
const model = defineModel<T>({ required: true })

const root = ref<HTMLElement | null>(null)
const chips = ref<HTMLElement | null>(null)

function reportPartId(value: string) {
  return `report-part-${value}`
}

/** Keeps the tab content starting right under the pinned bar after a switch. */
function selectTab(value: T) {
  model.value = value
  const bar = root.value
  if (!bar) return
  const top = bar.getBoundingClientRect().top + window.scrollY - topbarHeight()
  if (window.scrollY > top) window.scrollTo({ top })
}

function topbarHeight() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64
}

// Clicks scroll smoothly through other parts; the observer must not fight that.
let lockedUntil = 0
function jumpTo(value: T) {
  model.value = value
  lockedUntil = Date.now() + 900
  document.getElementById(reportPartId(value))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let observer: IntersectionObserver | null = null
function observe() {
  observer?.disconnect()
  observer = null
  if (!props.scroll || !import.meta.client) return
  const offset = topbarHeight() + (root.value?.offsetHeight ?? 52)
  observer = new IntersectionObserver(
    (entries) => {
      if (Date.now() < lockedUntil) return
      const visible = entries.filter((entry) => entry.isIntersecting)
      const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const value = top?.target.id.replace('report-part-', '') as T | undefined
      if (value && props.options.some((option) => option.value === value)) model.value = value
    },
    { rootMargin: `-${offset + 1}px 0px -65% 0px` },
  )
  for (const option of props.options) {
    const part = document.getElementById(reportPartId(option.value))
    if (part) observer.observe(part)
  }
}

// The active chip stays in view as the page scrolls.
watch(model, async () => {
  if (!props.scroll) return
  await nextTick()
  const strip = chips.value
  const active = strip?.querySelector<HTMLElement>('[aria-current="true"]')
  if (!strip || !active) return
  strip.scrollTo({ left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' })
})

onMounted(() => nextTick(observe))
watch(
  () => props.scroll,
  () => nextTick(observe),
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="root" class="report-nav no-print">
    <nav v-if="scroll" :aria-label="label">
      <div ref="chips" class="report-nav__chips">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="report-nav__chip"
          :aria-current="model === option.value ? 'true' : undefined"
          @click="jumpTo(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </nav>
    <UiSegmentedControl
      v-else
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
  background: var(--bg);
}

.report-nav__chips {
  display: flex;
  gap: var(--space-2);
  margin-inline: calc(var(--page-gutter) * -1);
  padding-inline: var(--page-gutter);
  overflow-x: auto;
  scrollbar-width: none;
}

.report-nav__chips::-webkit-scrollbar {
  display: none;
}

.report-nav__chip {
  flex: 0 0 auto;
  min-height: var(--control-sm);
  padding: 0 var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface);
  color: var(--text-muted);
  font: var(--text-control);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.report-nav__chip[aria-current='true'] {
  border-color: var(--inverse-surface);
  background: var(--inverse-surface);
  color: var(--on-inverse);
}
</style>
