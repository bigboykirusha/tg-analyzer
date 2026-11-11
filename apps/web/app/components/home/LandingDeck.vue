<script setup lang="ts">
/**
 * The landing's one visual: a stack of three reports, each its poster in miniature — Sonner's stack of
 * toasts. The front one is read in full; the two behind show a strip of their colour. On load the cards rise
 * in one after another; every few seconds the front report leaves like a swiped toast, the next one moves up
 * with its pulse growing, and the old one fades in at the back. Hover lifts the strips; a click deals the next.
 * The deal pauses while the pointer or focus is on the deck and while the tab is hidden, and stops after two
 * rounds — it shows what reports look like, it is not a carousel to watch. Reduced motion: a still deck.
 * Every card stays in the DOM in reading order, so a screen reader reads all three.
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

/** order[0] is on top; order[1] and order[2] are behind it. */
const order = ref(props.cards.map((_, index) => index))
const leaving = ref<number | null>(null)
const paused = ref(false)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
let deals = 0
let timer: ReturnType<typeof setTimeout> | undefined
let settle: ReturnType<typeof setTimeout> | undefined

const slotOf = (index: number) => order.value.indexOf(index)

function deal() {
  if (leaving.value !== null || props.cards.length < 2) return
  const [front, ...rest] = order.value
  leaving.value = front!
  order.value = [...rest, front!]
  deals += 1
  clearTimeout(settle)
  settle = setTimeout(() => (leaving.value = null), DEAL_MS)
}

function schedule() {
  clearTimeout(timer)
  if (reduced.value || paused.value || deals >= ROUNDS * props.cards.length) return
  if (typeof document !== 'undefined' && document.hidden) return
  timer = setTimeout(() => {
    deal()
    schedule()
  }, INTERVAL_MS)
}

function pause() {
  paused.value = true
  clearTimeout(timer)
}
function resume() {
  paused.value = false
  schedule()
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
    @pointerenter="pause"
    @pointerleave="resume"
    @focusin="pause"
    @focusout="resume"
    @click="deal"
  >
    <li
      v-for="(card, index) in cards"
      :key="card.key"
      class="deck__card"
      :class="{ 'deck__card--leaving': leaving === index }"
      :data-slot="slotOf(index)"
      :style="{ '--n': index }"
      :aria-hidden="slotOf(index) === 0 ? undefined : 'true'"
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
          :key="slotOf(index) === 0 ? 'front' : 'behind'"
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
 * The stack is Sonner's (Emil Kowalski, «Building a toast component»): the cards share one cell and one
 * height; each one behind is lifted by one step and is 5 % smaller, scaled from its top edge so only a strip
 * of it shows above the one in front, and its content is hidden. Hover lifts the steps a little, as Sonner
 * expands its stack. Slots move with one ease-out (400 ms, as Sonner); nothing turns.
 */
.deck {
  --lift: var(--space-4);
  /* The stacking order inside the deck: the dealt card is lifted above the top one, then put under all. */
  --deck-z-lift: 4;
  --deck-z-top: 3;
  --deck-z-middle: 2;
  --deck-1: translateY(calc(-1 * var(--lift))) scale(0.95);
  --deck-2: translateY(calc(-2 * var(--lift))) scale(0.9);
  display: grid;
  width: 100%;
  /* Room above the front card for the two strips behind it, and for the lift on hover. */
  padding-top: calc(var(--space-6) * 2);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.deck__card {
  display: grid;
  grid-area: 1 / 1;
  transform-origin: 50% 0;
  transition: transform var(--duration-sheet) var(--ease-standard);
  /* Dealt in on load: each card rises from below, back one first, as a toast enters. The individual
     `translate` property composes with the slot's `transform`, so the entrance never fights the stack. */
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

/* Behind the top card a report is only its colour (Sonner hides the content of the toasts behind). */
.deck__card :deep(.home-card > *) {
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.deck__card:not([data-slot='0']) :deep(.home-card > *) {
  opacity: 0;
}

.deck__card :deep(.home-card) {
  min-height: 216px;
  box-shadow: var(--shadow-float);
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
}

/*
 * The top report leaves as a swiped toast — down and out, accelerating — and comes back behind the others,
 * fading in at the last place while the two in front move up a step.
 */
.deck__card--leaving {
  animation: deck-deal var(--duration-deal) both;
}

@keyframes deck-in {
  from {
    opacity: 0;
    translate: 0 var(--space-12);
  }
}

@keyframes deck-deal {
  0% {
    z-index: var(--deck-z-lift);
    opacity: 1;
    transform: none;
    animation-timing-function: var(--ease-exit);
  }

  40% {
    z-index: var(--deck-z-lift);
    opacity: 0;
    transform: translateY(var(--space-10)) scale(0.98);
  }

  41% {
    z-index: 0;
    opacity: 0;
    transform: var(--deck-2);
    animation-timing-function: var(--ease-standard);
  }

  100% {
    z-index: 0;
    opacity: 1;
    transform: var(--deck-2);
  }
}

@media (hover: hover) and (pointer: fine) {
  .deck:hover {
    --lift: var(--space-6);
  }
}

@media (min-width: 901px) {
  .deck {
    justify-self: center;
    max-width: 400px;
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
}
</style>
