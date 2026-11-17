<script setup lang="ts">
import type { Component } from 'vue'
import type { ReportDto } from '@tg-analyzer/shared'
import { ChevronRight, Clock, Flame, Quote, Scale, Users } from '../../lib/icons'

/**
 * One finding on the poster's material, then up to two quieter routes into the report. Each link leads to the
 * card behind the finding. Both read from the same analytics composables.
 */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t, tc, formatNumber } = useI18n()
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

const streak = useStreak(() => props.data)
const words = useWordsFacts(() => props.data)
const match = useMatch(() => props.data)
const balance = useBalance(() => props.data)
const peak = usePeakWindow(() => props.data)

interface Finding {
  key: string
  target: string
  icon: Component
  /** The big part: a number, a word or a window. */
  figure: string
  /** The small word beside a number («дней подряд»). */
  unit?: string
  /** The line the card answers. */
  sub?: string
  /** A figure that is a word or a phrase, not a number: set a step smaller. */
  text?: boolean
}

/** «19–22»: the window's two hours, the dash held to its numbers. */
const peakFigure = computed(() => {
  const span = peak.window.value
  return span ? `${span.start}⁠–⁠${(span.start + span.length) % 24}` : null
})

const findings = computed(() => {
  const out: Finding[] = []
  if (streak.value)
    out.push({
      key: 'streak',
      target: 'part-streak',
      icon: Flame,
      figure: formatNumber(streak.value.days),
      unit: tc('report.highlights.streakUnit', streak.value.days),
      sub: streak.value.answer,
    })
  if (!props.noWords && words.word.value && words.figure.value)
    out.push({
      key: 'word',
      target: 'part-word',
      icon: Quote,
      figure: words.figure.value,
      sub: words.answer.value ?? undefined,
      text: true,
    })
  if (peak.answer.value && peakFigure.value)
    out.push({
      key: 'time',
      target: 'part-time',
      icon: Clock,
      figure: peakFigure.value,
      sub: t('report.highlights.peak'),
    })
  // Head to head: only when someone leads; «almost even everywhere» is the weakest thing it can say.
  if (match.answer.value && !match.mostlyEven.value && match.tally.value.mine !== match.tally.value.theirs)
    out.push({ key: 'match', target: 'part-match', icon: Users, figure: match.answer.value, text: true })
  if (balance.answer.value && balance.headline.value)
    out.push({
      key: 'balance',
      target: 'part-balance',
      icon: Scale,
      figure: balance.headline.value,
      sub: balance.answer.value,
    })
  return out.slice(0, 3)
})
const lead = computed(() => findings.value[0])
const details = computed(() => findings.value.slice(1))

function go(event: MouseEvent, target: string) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const card = document.getElementById(target)
  if (!card) return
  event.preventDefault()
  card.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <section v-if="lead" id="chapter-highlights" class="highlights" aria-labelledby="highlights-title">
    <h2 id="highlights-title" class="t-label highlights__title">{{ t('report.highlights.title') }}</h2>
    <div class="highlights__grid" :class="{ 'highlights__grid--paired': details.length > 0 }">
      <a :href="`#${lead.target}`" class="find" data-on-poster @click="go($event, lead.target)">
        <span class="find__icons" aria-hidden="true">
          <component :is="lead.icon" />
          <ChevronRight class="find__arrow" />
        </span>
        <span class="find__body">
          <span class="find__main">
            <b class="find__figure" :class="{ 'find__figure--text': lead.text }">{{ lead.figure }}</b>
            <span v-if="lead.unit" class="t-label">{{ lead.unit }}</span>
          </span>
          <span v-if="lead.sub" class="find__sub t-label">{{ lead.sub }}</span>
        </span>
      </a>
      <UiGroup v-if="details.length" class="highlights__details">
        <UiListRow
          v-for="item in details"
          :key="item.key"
          :href="`#${item.target}`"
          :title="item.unit ? `${item.figure} ${item.unit}` : item.figure"
          :subtitle="item.sub"
          chevron
          wrap
          @click="go($event, item.target)"
        >
          <template #leading><component :is="item.icon" class="highlights__icon" aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
    </div>
  </section>
</template>

<style scoped>
/* On the page's left edge, as every part's heading: not half-way into the tiles. */
.highlights__title {
  padding-bottom: var(--space-2);
  color: var(--text-muted);
}

.highlights__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

.find {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  min-height: calc(var(--space-16) * 2);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background-color: var(--poster);
  background-image: var(--poster-image);
  box-shadow: var(--edge-light);
  color: var(--on-poster);
  transition: transform var(--duration-press) var(--ease-standard);
}

.find:active {
  transform: scale(var(--press-scale));
}

.find__icons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  --icon-size: var(--icon-md);
}

.find__arrow {
  color: var(--on-poster-muted);
  --icon-size: var(--icon-sm);
}

.find__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  margin-top: auto;
}

.find__main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-2);
  min-width: 0;
}

.find__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
  overflow-wrap: anywhere;
}

.find__figure--text {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

.find__sub {
  color: var(--on-poster-muted);
}

.highlights__details {
  --group-inset: var(--space-4);
}

.highlights__details :deep(.group__card) {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.highlights__details :deep(.list-row__copy) {
  overflow-wrap: anywhere;
}

.highlights__icon {
  color: var(--them-ink);
  --icon-size: var(--icon-md);
}

@media (min-width: 901px) {
  .highlights__grid--paired {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
}
</style>
