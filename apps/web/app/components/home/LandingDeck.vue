<script setup lang="ts">
export interface DeckCard {
  key: string
  chatId: string
  title: string
  avatarTitle: string
  meta: string
  pulse: { sent: number; received: number }[]
  to?: string
}

const props = defineProps<{ cards: DeckCard[]; label: string }>()
/** A still fan of three posters (18.11: no «Следующий пример» — the landing is one screen with one action). */
const front = 0
const slotOf = (index: number) => (index - front + props.cards.length) % props.cards.length
</script>

<template>
  <div class="deck-stage">
    <div class="deck-stage__art">
      <ul class="deck" :aria-label="label">
        <li
          v-for="(card, index) in cards"
          :key="card.key"
          class="deck__card"
          :data-slot="slotOf(index)"
          :aria-hidden="index !== front || undefined"
        >
          <HomeCard
            :chat-id="card.chatId"
            :title="card.title"
            :avatar-title="card.avatarTitle"
            :meta="card.meta"
            :to="index === front ? card.to : undefined"
            :has-avatar="false"
            poster
            square
          >
            <Pulse :data="card.pulse" :height="0" :bars="32" aria-hidden="true" />
          </HomeCard>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.deck-stage {
  /* Small enough for Safari's visible area on a short phone: the deck gives way, the action stays in view. */
  --deck-min-width: 160px;
  --deck-max-width: 320px;
  --deck-fan-clearance: var(--space-6);
  --deck-min-height: calc(var(--deck-min-width) + var(--deck-fan-clearance));
  --deck-max-height: calc(var(--deck-max-width) + var(--deck-fan-clearance));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  min-height: var(--deck-min-height);
}

.deck-stage__art {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--deck-min-height);
  max-height: var(--deck-max-height);
  container-type: size;
}

.deck {
  isolation: isolate;
  display: grid;
  flex: none;
  width: clamp(
    var(--deck-min-width),
    min(100cqw - var(--space-8), 100cqh - var(--deck-fan-clearance)),
    var(--deck-max-width)
  );
  padding-top: var(--deck-fan-clearance);
}

.deck__card {
  display: grid;
  grid-area: 1 / 1;
}

.deck__card[data-slot='0'] {
  z-index: var(--z-raise);
}

.deck__card[data-slot='1'] {
  z-index: 0;
  transform: translate(6%, -7%) rotate(4deg) scale(0.95);
}

.deck__card[data-slot='2'] {
  z-index: var(--z-under);
  transform: translate(-5%, -12%) rotate(-5deg) scale(0.9);
}

.deck__card :deep(.home-card) {
  min-height: 0;
  aspect-ratio: 1;
  box-shadow: var(--shadow-float);
}

.deck__card :deep(.home-card > *) {
  transition: opacity var(--transition-fast);
}

.deck__card:not([data-slot='0']) :deep(.home-card > *) {
  opacity: 0;
}

.deck__card :deep(.home-card__meta) {
  white-space: normal;
}

.deck__card :deep(.pulse) {
  --pulse-half: var(--space-5);
}

@media (prefers-reduced-motion: no-preference) {
  .deck {
    animation: deck-in var(--duration-sheet) var(--ease-standard) both;
  }

  @keyframes deck-in {
    from {
      opacity: 0;
      translate: 0 var(--space-2);
    }
  }
}

@media (max-width: 640px) {
  .deck__card :deep(.home-card__name) {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}

@media (min-width: 901px) {
  .deck-stage {
    --deck-poster-height: 296px;
    --deck-fan-clearance: var(--space-12);
    --deck-min-height: calc(var(--deck-poster-height) + var(--deck-fan-clearance));
    --deck-max-height: var(--deck-min-height);
  }

  .deck {
    width: min(100cqw - var(--space-8), 400px);
  }

  .deck__card :deep(.home-card) {
    min-height: var(--deck-poster-height);
    padding: var(--space-8);
    aspect-ratio: auto;
  }

  .deck__card :deep(.home-card__name) {
    font: var(--text-h2);
    letter-spacing: var(--tracking-h2);
  }

  .deck__card :deep(.pulse) {
    --pulse-half: var(--space-10);
  }
}
</style>
