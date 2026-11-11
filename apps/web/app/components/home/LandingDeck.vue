<script setup lang="ts">
/**
 * The landing's one visual: a deck of three reports, each its poster in miniature — the same tile home
 * shows. The front report is read in full; the two behind lean out and show only their colour.
 *
 * Motion, each with one job:
 *   deal-in   on load the cards rise in one after another and settle into the fan; the front pulse grows
 *             once its card has landed
 *   deal      every few seconds the deck is cut, as a hand does it: the top report slides off to the right while
 *             the rest of the deck slides left, each only half a card, until the two halves are clear of each
 *             other; there, overlapping nothing, the top report goes under, and the halves close up again — the
 *             old top card last, the next report in front. Its content comes up once it has landed, then its
 *             pulse grows. 0.8 s in all, ease-in-out both ways: no flick off the mark, no stop at speed.
 *   hover     the fan opens a little and the front card tilts towards the pointer (at most 6°)
 *   click     deals the next report
 * The deal pauses while the pointer or focus is on the deck and while the tab is hidden, and stops after two
 * rounds — it shows what reports look like, it is not a carousel to watch. Reduced motion: a still deck, no
 * tilt. Every card stays in the DOM in reading order, so a screen reader reads all three.
 *
 * Fit: on a phone the landing is one screen, so the deck takes the height that is left under the copy and scales
 * itself into it (never up, never under 55 %). It is measured before the deal-in plays, so the cards rise in at
 * their final size — nothing shrinks after the page has appeared.
 *
 * During a deal the cards move by keyframes only — no transitions underneath. Safari otherwise replays the slot
 * transition after the keyframes end and the card jumps back before settling; and the deal ends on the
 * animation's own `animationend`, not on a timer that a busy phone can beat.
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

/** How long a report stays on top. */
const INTERVAL_MS = 3600
/** --duration-shuffle, plus a margin: if `animationend` never comes (a hidden tab), the deal still ends. */
const DEAL_FALLBACK_MS = 1200
/** The deal-in on load ends by then (700 ms and two staggers); after it the entrance is taken off the cards. */
const ENTER_MS = 1200
const ROUNDS = 2
const TILT_DEG = 6
/** The smallest the deck may get to fit a short phone; below it the page scrolls instead. */
const MIN_FIT = 0.55

/** order[0] is on top; order[1] and order[2] are behind it. */
const order = ref(props.cards.map((_, index) => index))
/** The card being put under during a deal. */
const leaving = ref<number | null>(null)
/** Bumped when a deal has landed: the new front's pulse grows again. */
const round = ref(0)
const tilt = ref({ x: 0, y: 0 })
const entered = ref(false)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const stage = ref<HTMLElement | null>(null)
const deck = ref<HTMLElement | null>(null)
/** The deck's scale in its stage; null until measured (the deal-in waits for it). */
const fit = ref<number | null>(null)
let resize: ResizeObserver | undefined

/** Phones only: the stage is the height left on the screen; the deck's own box does not change with `scale`. */
function measure() {
  if (!stage.value || !deck.value) return
  const phone = window.matchMedia('(max-width: 900px)').matches
  const room = stage.value.clientHeight
  const natural = deck.value.offsetHeight
  fit.value = phone && room > 0 && natural > 0 ? Math.max(MIN_FIT, Math.min(1, room / natural)) : 1
}
let paused = false
let deals = 0
let timer: ReturnType<typeof setTimeout> | undefined
let fallback: ReturnType<typeof setTimeout> | undefined
let enterTimer: ReturnType<typeof setTimeout> | undefined

const slotOf = (index: number) => order.value.indexOf(index)

function deal() {
  if (leaving.value !== null || props.cards.length < 2) return
  const [front, ...rest] = order.value
  order.value = [...rest, front!]
  tilt.value = { x: 0, y: 0 }
  deals += 1
  if (reduced.value) return void (round.value += 1)
  leaving.value = front!
  clearTimeout(fallback)
  fallback = setTimeout(landed, DEAL_FALLBACK_MS)
}

function landed() {
  if (leaving.value === null) return
  clearTimeout(fallback)
  leaving.value = null
  round.value += 1
}

/** The leaving card's own deal animation has ended (not its content's, not another card's). */
function onAnimationEnd(event: AnimationEvent, index: number) {
  if (index === leaving.value && event.target === event.currentTarget && event.animationName.startsWith('deck-cut'))
    landed()
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
  if (reduced.value || event.pointerType !== 'mouse' || leaving.value !== null) return
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
  measure()
  if (stage.value && 'ResizeObserver' in window) {
    resize = new ResizeObserver(measure)
    resize.observe(stage.value)
  }
  enterTimer = setTimeout(() => (entered.value = true), ENTER_MS)
  document.addEventListener('visibilitychange', onVisibility)
  schedule()
})
onBeforeUnmount(() => {
  resize?.disconnect()
  clearTimeout(timer)
  clearTimeout(fallback)
  clearTimeout(enterTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})
watch(reduced, schedule)
</script>

<template>
  <div ref="stage" class="deck-stage" :class="{ 'deck-stage--ready': fit !== null }">
    <ul
      ref="deck"
      class="deck"
      :class="{ 'deck--entered': entered, 'deck--dealing': leaving !== null }"
      :aria-label="label"
      :style="{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg`, scale: fit ?? 1 }"
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
        @animationend="onAnimationEnd($event, index)"
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
            :key="slotOf(index) === 0 && leaving === null ? `front-${round}` : 'still'"
            :data="card.pulse"
            :height="0"
            :bars="32"
            :grow="slotOf(index) === 0 && leaving === null"
          />
        </HomeCard>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* The room the deck has: centred in it; on a phone the landing gives it the height left under the copy. */
.deck-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

/* Until it is measured the deck waits at the start of its deal-in, invisible. */
.deck-stage:not(.deck-stage--ready) .deck__card {
  animation-play-state: paused;
}

/*
 * One cell; the three cards are stacked in it. A slot is a place in the fan: 0 on top, flat; 1 and 2 behind,
 * nudged up and out, turned and a little smaller. --spread opens the fan on hover. Every place is written as the
 * same three functions (translate, rotate, scale), so the browser interpolates them function by function.
 */
.deck {
  --spread: 1;
  --deck-z-lift: 4;
  --deck-z-top: 3;
  --deck-z-middle: 2;
  /* How far each half of the cut travels: half a card and a little more, so the halves clear each other. */
  --cut: 58%;
  --deck-0: translate(0%, 0%) rotate(0deg) scale(1);
  --deck-1: translate(calc(var(--spread) * 6%), calc(var(--spread) * -7%)) rotate(calc(var(--spread) * 4deg))
    scale(0.95);
  --deck-2: translate(calc(var(--spread) * -5%), calc(var(--spread) * -12%)) rotate(calc(var(--spread) * -5deg))
    scale(0.9);
  /* The places the halves of the cut reach. */
  --deck-out: translate(var(--cut), 2%) rotate(5deg) scale(0.97);
  --deck-1-cut: translate(calc(var(--spread) * 6% - var(--cut)), calc(var(--spread) * -7%))
    rotate(calc(var(--spread) * 4deg)) scale(0.95);
  --deck-2-cut: translate(calc(var(--spread) * -5% - var(--cut)), calc(var(--spread) * -12%))
    rotate(calc(var(--spread) * -5deg)) scale(0.9);
  display: grid;
  align-self: center;
  width: 100%;
  /* A phone: a hand-sized deck in the middle, with room on both sides for the fan and the cut. */
  max-width: 264px;
  padding: var(--space-10) 0 0;
  cursor: pointer;
  user-select: none;
  perspective: 1200px;
  -webkit-tap-highlight-color: transparent;
}

.deck__card {
  display: grid;
  grid-area: 1 / 1;
  transform: var(--deck-0);
  /* Places move on one ease-out: quick to start, soft to land, no overshoot (the hover's spread). */
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
  min-height: 232px;
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

.deck__card:not([data-slot='0'], .deck__card--leaving) :deep(.home-card > *),
.deck--dealing .deck__card[data-slot='0'] :deep(.home-card > *) {
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
  --pulse-half: var(--space-6);
  --pulse-delay: var(--duration-fast);
}

/* After the deal-in the cards carry no entrance any more. */
.deck--entered .deck__card {
  animation: none;
}

/*
 * The cut. Keyframes only while it runs (no transition underneath, see the script's note); each card goes from
 * its old place, out to its half of the cut, and into its new place. At 45 % the halves are clear of each other
 * and stand still for a frame: only there does the top card change layer.
 */
.deck--dealing .deck__card {
  transition: none;
}

.deck--dealing .deck__card[data-slot='0'] {
  animation: deck-cut-front var(--duration-shuffle) both;
}

.deck--dealing .deck__card[data-slot='1']:not(.deck__card--leaving) {
  animation: deck-cut-middle var(--duration-shuffle) both;
}

.deck--dealing .deck__card--leaving {
  animation: deck-cut-leave var(--duration-shuffle) both;
}

.deck__card--leaving :deep(.home-card > *) {
  animation: deck-cut-content var(--duration-shuffle) linear both;
  transition: none;
}

@keyframes deck-in {
  from {
    opacity: 0;
    translate: 0 var(--space-16);
    rotate: -6deg;
  }
}

/* The top report: off to the right, under the deck, into the last place. */
@keyframes deck-cut-leave {
  0% {
    z-index: var(--deck-z-lift);
    transform: var(--deck-0);
    animation-timing-function: var(--ease-in-out);
  }

  45% {
    z-index: var(--deck-z-lift);
    transform: var(--deck-out);
    animation-timing-function: step-end;
  }

  46% {
    z-index: 1;
    transform: var(--deck-out);
    animation-timing-function: var(--ease-in-out);
  }

  100% {
    z-index: 1;
    transform: var(--deck-2);
  }
}

/* The next report: with the rest of the deck to the left, then to the front. */
@keyframes deck-cut-front {
  0% {
    transform: var(--deck-1);
    animation-timing-function: var(--ease-in-out);
  }

  45% {
    transform: var(--deck-1-cut);
    animation-timing-function: var(--ease-in-out);
  }

  100% {
    transform: var(--deck-0);
  }
}

/* The last report: with the rest of the deck to the left, then one place forward. */
@keyframes deck-cut-middle {
  0% {
    transform: var(--deck-2);
    animation-timing-function: var(--ease-in-out);
  }

  45% {
    transform: var(--deck-2-cut);
    animation-timing-function: var(--ease-in-out);
  }

  100% {
    transform: var(--deck-1);
  }
}

/* The content stays while the card is out in view, and fades as it slides under the deck. */
@keyframes deck-cut-content {
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
    transition: none;
  }

  .deck__card[data-slot='0'] :deep(.home-card) {
    transform: none;
  }
}
</style>
