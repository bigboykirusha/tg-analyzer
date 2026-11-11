<script setup lang="ts">
/**
 * The landing's one visual: a deck of three reports, each its poster in miniature — the same tile home
 * shows. The front report is read in full; the two behind lean out and show only their colour.
 *
 * Motion, each with one job:
 *   deal-in   on load the cards rise in one after another and settle into the fan; the front pulse grows
 *             once its card has landed
 *   deal      every few seconds the front report is flicked off to the left, turning as a card thrown by
 *             hand, and slides under the deck; the two behind step forward on a spring without overshoot;
 *             the new front's content fades up a moment after it lands, and its pulse grows
 *   hover     the fan opens a little and the front card tilts towards the pointer (at most 6°), so the deck
 *             feels like a thing on the table
 *   click     deals the next report
 * The deal pauses while the pointer or focus is on the deck and while the tab is hidden, and stops after two
 * rounds — it shows what reports look like, it is not a carousel to watch. Reduced motion: a still deck, no
 * tilt. Every card stays in the DOM in reading order, so a screen reader reads all three.
 */
export interface DeckCard {
  key: string
  chatId: string
  title: string
  avatarTitle: string
  meta: string
  pulse: { sent: number; received: number }[]
}

const props = defineProps<{ cards: DeckCard[]; label: string }>()

/** How long a report stays on top, and how long a deal takes (--duration-deal). */
const INTERVAL_MS = 3600
const DEAL_MS = 700
const ROUNDS = 2
const TILT_DEG = 6

/** order[0] is on top; order[1] and order[2] are behind it. */
const order = ref(props.cards.map((_, index) => index))
const leaving = ref<number | null>(null)
const tilt = ref({ x: 0, y: 0 })
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
let paused = false
let deals = 0
let timer: ReturnType<typeof setTimeout> | undefined
let settle: ReturnType<typeof setTimeout> | undefined

const slotOf = (index: number) => order.value.indexOf(index)

function deal() {
  if (leaving.value !== null || props.cards.length < 2) return
  const [front, ...rest] = order.value
  leaving.value = front!
  order.value = [...rest, front!]
  tilt.value = { x: 0, y: 0 }
  deals += 1
  clearTimeout(settle)
  settle = setTimeout(() => (leaving.value = null), DEAL_MS)
}

function schedule() {
  clearTimeout(timer)
  if (reduced.value || paused || deals >= ROUNDS * props.cards.length) return
  if (document.hidden) return
  timer = setTimeout(() => {
    deal()
    schedule()
  }, INTERVAL_MS)
}

function pause() {
  paused = true
  clearTimeout(timer)
}
function resume() {
  paused = false
  tilt.value = { x: 0, y: 0 }
  schedule()
}
function onClick() {
  deal()
  if (!paused) schedule()
}

/** The front card leans towards the pointer: ±6° around its centre, a mouse only. */
function onMove(event: PointerEvent) {
  if (reduced.value || event.pointerType !== 'mouse') return
  const card = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-slot="0"]')
  if (!card) return
  const box = card.getBoundingClientRect()
  const x = (event.clientX - box.left) / box.width - 0.5
  const y = (event.clientY - box.top) / box.height - 0.5
  tilt.value = { x: Math.max(-1, Math.min(1, x * 2)) * TILT_DEG, y: Math.max(-1, Math.min(1, -y * 2)) * TILT_DEG }
}

function onVisibility() {
  if (document.hidden) clearTimeout(timer)
  else schedule()
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  schedule()
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(settle)
  document.removeEventListener('visibilitychange', onVisibility)
})
watch(reduced, schedule)
</script>

<template>
  <ul
    class="deck"
    :aria-label="label"
    :style="{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg` }"
    @pointerenter="pause"
    @pointerleave="resume"
    @pointermove="onMove"
    @focusin="pause"
    @focusout="resume"
    @click="onClick"
  >
    <li
      v-for="(card, index) in cards"
      :key="card.key"
      class="deck__card"
      :class="{ 'deck__card--leaving': leaving === index }"
      :data-slot="slotOf(index)"
      :style="{ '--n': index }"
    >
      <HomeCard
        :chat-id="card.chatId"
        :title="card.title"
        :avatar-title="card.avatarTitle"
        :meta="card.meta"
        :has-avatar="false"
        poster
      >
        <Pulse
          :key="slotOf(index) === 0 ? `front-${order.join()}` : 'behind'"
          :data="card.pulse"
          :height="0"
          :bars="32"
          :grow="slotOf(index) === 0"
        />
      </HomeCard>
    </li>
  </ul>
</template>

<style scoped>
/*
 * One cell; the three cards are stacked in it. A slot is a place in the fan: 0 on top, flat; 1 and 2 behind,
 * nudged up and out, turned and a little smaller. --spread opens the fan on hover.
 */
.deck {
  --spread: 1;
  --deck-z-lift: 4;
  --deck-z-top: 3;
  --deck-z-middle: 2;
  --deck-1: translate(calc(var(--spread) * 6%), calc(var(--spread) * -7%)) rotate(calc(var(--spread) * 4deg))
    scale(0.95);
  --deck-2: translate(calc(var(--spread) * -5%), calc(var(--spread) * -12%)) rotate(calc(var(--spread) * -5deg))
    scale(0.9);
  display: grid;
  width: 100%;
  /* The fan stays inside the column: the cards behind lean out by a few per cent on each side. */
  padding: var(--space-10) var(--space-4) 0;
  cursor: pointer;
  user-select: none;
  perspective: 1200px;
  -webkit-tap-highlight-color: transparent;
}

.deck__card {
  display: grid;
  grid-area: 1 / 1;
  /* Places move on a critically damped spring: quick, no overshoot. */
  transition: transform var(--duration-deal) var(--spring-snappy);
  /* Dealt in on load: the back card first, each rising from below and turning into its place. The individual
     `translate`/`rotate` properties compose with the slot's `transform`, so the entrance never fights the fan. */
  animation: deck-in var(--duration-deal) var(--ease-standard) both;
  animation-delay: calc((2 - var(--n)) * var(--stagger-card) * 2);
}

.deck__card[data-slot='0'] {
  z-index: var(--deck-z-top);
}

.deck__card[data-slot='1'] {
  z-index: var(--deck-z-middle);
  transform: var(--deck-1);
}

.deck__card[data-slot='2'] {
  z-index: 1;
  transform: var(--deck-2);
}

.deck__card :deep(.home-card) {
  min-height: 216px;
  box-shadow: var(--shadow-float);
  transition:
    transform var(--duration-sheet) var(--ease-standard),
    box-shadow var(--duration-sheet) var(--ease-standard);
}

/* The front card follows the pointer. */
.deck__card[data-slot='0'] :deep(.home-card) {
  transform: rotateY(var(--tilt-x, 0deg)) rotateX(var(--tilt-y, 0deg));
}

/* Behind the top card a report is only its colour; the new front's content comes up once it has landed. */
.deck__card :deep(.home-card > *) {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    translate var(--duration-sheet) var(--ease-standard);
}

.deck__card[data-slot='0'] :deep(.home-card > *) {
  transition-delay: var(--duration-fast);
}

.deck__card:not([data-slot='0']) :deep(.home-card > *) {
  opacity: 0;
  translate: 0 var(--space-1);
}

.deck__card :deep(.home-card__name) {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

/* The finding is the point of an example: it may take two lines. */
.deck__card :deep(.home-card__meta) {
  white-space: normal;
}

.deck__card :deep(.pulse) {
  --pulse-half: var(--space-8);
  /* The front pulse grows once its card has landed. */
  --pulse-delay: var(--duration-sheet);
}

/* The top report is flicked off to the left, turning, accelerating, then slides under into the last place. */
.deck__card--leaving {
  animation: deck-deal var(--duration-deal) both;
}

@keyframes deck-in {
  from {
    opacity: 0;
    translate: 0 var(--space-16);
    rotate: -6deg;
  }
}

@keyframes deck-deal {
  0% {
    z-index: var(--deck-z-lift);
    transform: none;
    animation-timing-function: var(--ease-exit);
  }

  42% {
    z-index: var(--deck-z-lift);
    transform: translate(-58%, 4%) rotate(-14deg);
    animation-timing-function: var(--ease-standard);
  }

  50% {
    z-index: 0;
  }

  100% {
    z-index: 0;
    transform: var(--deck-2);
  }
}

@media (hover: hover) and (pointer: fine) {
  .deck:hover {
    --spread: 1.3;
  }

  .deck:hover .deck__card[data-slot='0'] :deep(.home-card) {
    box-shadow: var(--shadow-overlay);
  }
}

@media (min-width: 901px) {
  .deck {
    justify-self: center;
    max-width: 400px;
    padding: var(--space-12) 0 0;
  }

  .deck__card :deep(.home-card) {
    min-height: 296px;
    padding: var(--space-8);
  }

  .deck__card :deep(.pulse) {
    --pulse-half: var(--space-10);
  }
}

@media (prefers-reduced-motion: reduce) {
  .deck__card,
  .deck__card--leaving {
    animation: none;
  }

  .deck__card[data-slot='0'] :deep(.home-card) {
    transform: none;
  }
}
</style>
