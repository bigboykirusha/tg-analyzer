<script setup lang="ts">
/**
 * The landing's one visual: a deck of three reports, each its poster in miniature — the same tile home
 * shows. The front report is read in full; the two behind lean out and show only their colour.
 *
 * Motion, each with one job:
 *   deal-in   on load the cards rise in one after another and settle into the fan; the front pulse grows
 *             once its card has landed
 *   deal      every few seconds the front report slides out to the right past the deck, stops, goes under and
 *             comes back behind it into the last place; the two others step forward; the new front's content
 *             fades up a moment after it lands, and its pulse grows
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
/** How long putting the top report under the deck takes (--duration-shuffle). */
const DEAL_MS = 1100
/** The deal-in on load ends by then (700 ms and two staggers); after it the entrance is taken off the cards, so a
 *  card that has been dealt does not play it again when its deal animation comes off. */
const ENTER_MS = 1200
const ROUNDS = 2
const TILT_DEG = 6

/** order[0] is on top; order[1] and order[2] are behind it. */
const order = ref(props.cards.map((_, index) => index))
const leaving = ref<number | null>(null)
const tilt = ref({ x: 0, y: 0 })
const entered = ref(false)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
let paused = false
let deals = 0
let timer: ReturnType<typeof setTimeout> | undefined
let settle: ReturnType<typeof setTimeout> | undefined
let enterTimer: ReturnType<typeof setTimeout> | undefined

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
  enterTimer = setTimeout(() => (entered.value = true), ENTER_MS)
  document.addEventListener('visibilitychange', onVisibility)
  schedule()
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(settle)
  clearTimeout(enterTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})
watch(reduced, schedule)
</script>

<template>
  <ul
    class="deck"
    :class="{ 'deck--entered': entered }"
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
  /* Places move on one ease-out: quick to start, soft to land, no overshoot. */
  transition: transform var(--duration-deal) var(--ease-standard);
  will-change: transform;
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

.deck__card:not([data-slot='0'], .deck__card--leaving) :deep(.home-card > *) {
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

/* After the deal-in the cards carry no entrance any more. */
.deck--entered .deck__card {
  animation: none;
}

/*
 * Putting the top report at the bottom of the deck, as a hand does — never fading it out:
 *   out    it slides to the right, past the edge of the deck, turning a little: it starts gently and slows to a
 *          stop (ease-in-out: no flick off the mark, no turn-around at speed). 125 % of its width with 8°
 *          clears every other card on any screen.
 *   under  only there, overlapping nothing, does it go under the others: no card pops through another.
 *   back   it comes back behind the deck (ease-in-out: starts and lands softly) into the last place, where only
 *          its colour shows; its content fades while it slides under.
 * The two others step forward meanwhile. Off-screen on a phone the site clips it (overflow-x: clip).
 */
.deck .deck__card--leaving {
  animation: deck-deal var(--duration-shuffle) both;
}

.deck__card--leaving :deep(.home-card > *) {
  animation: deck-deal-content var(--duration-shuffle) linear both;
  transition: none;
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
    animation-timing-function: var(--ease-in-out);
  }

  48% {
    z-index: var(--deck-z-lift);
    transform: translateX(125%) rotate(8deg) scale(0.95);
    animation-timing-function: step-end;
  }

  49% {
    z-index: 1;
    transform: translateX(125%) rotate(8deg) scale(0.95);
    animation-timing-function: var(--ease-in-out);
  }

  100% {
    z-index: 1;
    transform: var(--deck-2);
  }
}

/* The content stays while the card is out in view, and fades as it slides under the deck. */
@keyframes deck-deal-content {
  0%,
  50% {
    opacity: 1;
  }

  80%,
  100% {
    opacity: 0;
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
