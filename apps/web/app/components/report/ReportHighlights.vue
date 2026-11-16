<script setup lang="ts">
import type { Component } from 'vue'
import type { ReportDto } from '@tg-analyzer/shared'
import { Clock, Flame, Quote, Scale, Users } from '../../lib/icons'

/**
 * «Главное»: the verdict right under the poster — up to three findings as tiles, the first one wide on the poster's
 * material and the rest square. Each is the very line its card answers, read from the same functions the cards read
 * (`useStreak`, `useWordsFacts`, `usePeakWindow`, `useMatch`, `useBalance`), so the verdict and the report never say
 * two things. The three strongest the chat has, in a fixed order: the run of days, the word of the chat, the usual
 * window, who leads the head to head, a balance. A finding its card would not draw is skipped; each tile scrolls to
 * its card. Carries `#chapter-highlights`, the first stop of the chapter strip.
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
    out.push({ key: 'time', target: 'part-time', icon: Clock, figure: peakFigure.value, sub: peak.answer.value })
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

function go(event: MouseEvent, target: string) {
  const card = document.getElementById(target)
  if (!card) return
  event.preventDefault()
  card.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <section v-if="findings.length" id="chapter-highlights" class="highlights" aria-labelledby="highlights-title">
    <h2 id="highlights-title" class="t-label highlights__title">{{ t('report.highlights.title') }}</h2>
    <div class="highlights__grid">
      <a
        v-for="(item, index) in findings"
        :key="item.key"
        :href="`#${item.target}`"
        class="find"
        :class="{ 'find--wide': index === 0 || findings.length === 2 }"
        @click="go($event, item.target)"
      >
        <component :is="item.icon" class="find__icon" aria-hidden="true" />
        <span class="find__body">
          <span class="find__main">
            <b class="find__figure" :class="{ 'find__figure--text': item.text }">{{ item.figure }}</b>
            <span v-if="item.unit" class="find__unit t-label">{{ item.unit }}</span>
          </span>
          <span v-if="item.sub" class="find__sub t-label">{{ item.sub }}</span>
        </span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.highlights {
  /* A tap on the chapter strip stops it under the bar (the page's `scroll-padding-top`) and the strip. */
  scroll-margin-top: calc(var(--control-sm) + var(--space-4));
}

@media (min-width: 901px) {
  .highlights {
    scroll-margin-top: 0;
  }
}

.highlights__title {
  padding: 0 var(--space-2) var(--space-2);
  color: var(--text-muted);
}

/* Two columns: the first finding takes both on the poster's material, the others are squares of its light tone. */
.highlights__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.find {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  aspect-ratio: 1;
  padding: var(--space-4);
  border-radius: var(--radius-card);
  /* Ink on the person's light tone, as on their poster. */
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  background-color: var(--poster-light);
  color: var(--on-poster);
  transition: transform var(--duration-press) var(--ease-standard);
}

.find:active {
  transform: scale(var(--press-scale));
}

.find--wide {
  grid-column: 1 / -1;
  aspect-ratio: auto;
  background-color: var(--poster);
  background-image: var(--poster-image);
  box-shadow: var(--edge-light);
}

.find__icon {
  flex: none;
  --icon-size: var(--icon-md);
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
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  overflow-wrap: anywhere;
}

.find__figure--text {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.find--wide .find__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.find--wide .find__figure--text {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

.find__sub {
  color: var(--on-poster-muted);
}
/* A computer: one row — the wide finding takes two of four columns, the others one each, none of them square. */
@media (min-width: 901px) {
  .highlights__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .find {
    grid-column: span 1;
    aspect-ratio: auto;
    min-height: calc(var(--space-16) * 2);
  }

  .find--wide {
    grid-column: span 2;
  }

  .find:only-child {
    grid-column: 1 / -1;
  }
}
</style>
