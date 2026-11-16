<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'

/**
 * The chapter strip of an open report: «Главное», «Вы и …», «Время» … as pills, the current one filled; a tap
 * scrolls to that part. One strip, two places, never both on screen:
 *   `flow` (a phone and a tablet) — a row under the poster that sticks under the app bar and, once stuck, takes the
 *     bar's own glass, so bar and strip read as one material (the page tells the bar through `data-chapters-stuck`);
 *   `bar` (a computer) — the middle of the report's bar: the name, the chapters, «Поделиться» in one line.
 * The current chapter always scrolls into the middle of the row, its neighbours peeking in at the edges.
 */
const props = defineProps<{ summary: ReportSummaryDto; placement: 'flow' | 'bar' }>()
const { t } = useI18n()
const { chapters, active, go } = useReportChapters(() => props.summary)

const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)

/** The current pill goes to the middle of the row — by the row's own scroll, never the page's. */
watch(
  active,
  async () => {
    await nextTick()
    const row = list.value
    const pill = row?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!row || !pill) return
    row.scrollTo({ left: pill.offsetLeft - (row.clientWidth - pill.offsetWidth) / 2, behavior: 'smooth' })
  },
  { flush: 'post' },
)

/** `flow` only: stuck once the strip has reached the bar's lower edge. */
const stuck = ref(false)
let frame = 0
function measure() {
  frame = 0
  const strip = root.value
  const bar = document.querySelector<HTMLElement>('[data-toolbar]')
  if (!strip || !bar || strip.offsetParent === null) return
  stuck.value = strip.getBoundingClientRect().top <= bar.getBoundingClientRect().bottom + 1
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(measure)
}
watch(stuck, (value) => document.documentElement.toggleAttribute('data-chapters-stuck', value))
onMounted(() => {
  if (props.placement !== 'flow') return
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
  document.documentElement.removeAttribute('data-chapters-stuck')
})
</script>

<template>
  <nav
    v-if="chapters.length > 1"
    ref="root"
    class="chapters no-print"
    :class="[`chapters--${placement}`, { 'is-stuck': stuck }]"
    :aria-label="t('report.chapters.label')"
  >
    <ul ref="list" class="chapters__row">
      <li v-for="item in chapters" :key="item.id">
        <UiButton
          size="sm"
          :variant="item.id === active ? 'primary' : 'quiet'"
          :aria-current="item.id === active ? 'true' : undefined"
          @click="go(item.id)"
        >
          {{ item.label }}
        </UiButton>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.chapters__row {
  position: relative;
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

/* The row bleeds to the screen's edges, so the pills run under them, not stop at the gutter. */
.chapters--flow .chapters__row {
  padding: 0 var(--page-gutter);
}

.chapters__row::-webkit-scrollbar {
  display: none;
}

.chapters__row li {
  flex: none;
}

/* A phone: a row in the flow under the poster, then the second row of the bar's glass. */
.chapters--flow {
  position: sticky;
  top: calc(var(--topbar-height) + env(safe-area-inset-top, 0px));
  z-index: calc(var(--z-header) - 1);
  padding: var(--space-2) 0;
}

.chapters--flow.is-stuck {
  background: var(--header-glass);
  box-shadow: var(--divider-bottom);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
}

.chapters--bar {
  display: none;
  min-width: 0;
}

@media (min-width: 901px) {
  .chapters--flow {
    display: none;
  }

  .chapters--bar {
    display: block;
  }
}
</style>
