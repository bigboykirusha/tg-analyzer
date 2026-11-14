<script setup lang="ts">
import { hueOf } from '../../lib/hue'

/**
 * The one card of the home screen: a person's avatar, their name, one quiet line, then what the card is
 * for — a pulse (a report), a button («Разобрать»), or nothing yet (a skeleton). With `to` the whole card
 * opens the report; the end slot (a badge, the «⋯» menu) stays clickable.
 *
 * `poster`: a report is its poster in miniature — the person's colour, their avatar as a light well, the name
 * and the pulse in poster ink — the same object the report opens with, the landing deck shows and «Итоги» end
 * on. A chat without a report (the newcomer's suggestions) stays a white card: colour means there is a report.
 * The name and the line are one line each, so tiles in a row are the same height.
 */
const props = defineProps<{
  chatId?: string
  title?: string
  /** The name the avatar's initials come from when the title says more than the name. */
  avatarTitle?: string
  hasAvatar?: boolean
  /** The quiet line under the name. */
  meta?: string
  to?: string
  skeleton?: boolean
  poster?: boolean
  /** Phones: the tile takes the whole row — the avatar, the name and the end slot on one line, the foot under them. */
  wide?: boolean
}>()

const hue = computed(() => (props.chatId ? hueOf(props.chatId) : undefined))
</script>

<template>
  <article
    class="home-card"
    :class="{ 'home-card--poster': poster && !skeleton, 'home-card--wide': wide }"
    :data-hue="hue"
    :aria-busy="skeleton || undefined"
  >
    <div class="home-card__top">
      <UiSkeleton v-if="skeleton" width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-pill)" />
      <ChatAvatar v-else :chat-id="chatId!" :title="avatarTitle ?? title" :has-avatar="hasAvatar" :on-poster="poster" />
      <div v-if="!skeleton" class="home-card__end"><slot name="end" /></div>
    </div>
    <div class="home-card__text">
      <template v-if="skeleton">
        <UiSkeleton class="home-card__line home-card__line--name" width="70%" />
        <UiSkeleton class="home-card__line home-card__line--meta" width="50%" />
      </template>
      <template v-else>
        <NuxtLink v-if="to" :to="to" class="home-card__name">{{ title }}</NuxtLink>
        <h3 v-else class="home-card__name">{{ title }}</h3>
        <p class="home-card__meta t-label">
          <slot name="meta">{{ meta }}</slot>
        </p>
      </template>
    </div>
    <div class="home-card__foot">
      <slot v-if="!skeleton" />
      <!-- The pulse's place: its two halves and the line between, so nothing moves when the tile arrives. -->
      <UiSkeleton v-else height="calc(var(--pulse-half) * 2 + var(--space-0-5))" />
    </div>
  </article>
</template>

<style scoped>
.home-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--ring-card);
  /* The pulse's half: 16 on a phone, where two tiles share a row and a taller one reads as a column, 24 wider. */
  --pulse-half: var(--space-4);
  color: var(--text);
  transition: transform var(--duration-fast) var(--ease-standard);
}

/* A report is its poster: the person's colour, ink type, the pulse in their two inks. */
.home-card--poster {
  background-color: var(--poster);
  background-image: var(--poster-image);
  box-shadow: var(--shadow-lift);
  color: var(--on-poster);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-ahead: var(--on-poster-faint);
  --btn-fill: var(--poster-button);
  --btn-fill-text: var(--on-poster);
  --btn-plain-text: var(--on-poster);
}

/* On a colour the 4 % step of a white card is lost: a poster steps by its own chip tint. */
.home-card.home-card--poster::before {
  background: var(--on-poster-chip);
}

/* A card that opens a report answers the pointer with one surface step over its own colour (lighter in dark). */
.home-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--hover);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

@media (hover: hover) and (pointer: fine) {
  .home-card:has(a.home-card__name):hover::before {
    opacity: 1;
  }

  /* A poster is an object: under the pointer it rises a little, as a card picked up from the table. */
  .home-card--poster:has(a.home-card__name):hover {
    transform: translateY(calc(-1 * var(--space-0-5)));
  }
}

.home-card:has(a.home-card__name):active:not(:has(.home-card__end :active)) {
  transform: scale(var(--press-scale-lg));
  transition-duration: var(--duration-press);
}

/* The skeleton's lines are the real lines' boxes: the name's h3 line, the meta's label line. */
.home-card__line {
  height: 1lh;
}

.home-card__line--name {
  font: var(--text-h3);
}

.home-card__line--meta {
  font: var(--text-label);
}

/* The avatar and the «⋯» share one centre line. */
.home-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.home-card__end {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.home-card__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
  margin-top: var(--space-1);
}

/*
 * The name is the card's link; it stretches over the whole card, the end slot sits above it. Two lines at most in
 * a grid tile («Продуктовая команда» is not cut to «Продуктовая коман…»), one on a wide phone tile.
 */
.home-card__name {
  display: -webkit-box;
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow-wrap: anywhere;
}

a.home-card__name::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

a.home-card__name:focus-visible {
  outline: none;
}

a.home-card__name:focus-visible::after {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

/* The quiet line may take two lines (a group's «Группа, 9 000 сообщений» on a phone), never more. */
.home-card__meta {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.home-card--poster .home-card__meta {
  color: var(--on-poster-muted);
}

.home-card__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-1);
  min-width: 0;
}

@media (min-width: 641px) {
  .home-card {
    --pulse-half: var(--space-6);
  }
}

/*
 * A phone: report tiles stand two to a row, small posters with a one-line name (a longer name makes the tile wide).
 * A wide tile takes the whole row: one line of avatar, name and badge, the pulse the full width under it.
 */
@media (max-width: 640px) {
  /* A half tile is a square (13.11): a little tighter inside and a lower pulse, so a name and a count fit it; a
     group's two-line count may make it taller rather than spill. A wide tile keeps its own lower height. */
  .home-card--poster:not(.home-card--wide) {
    gap: var(--space-2);
    aspect-ratio: 1;
    padding: var(--space-4);
    --pulse-half: var(--space-3);
  }

  .home-card--poster:not(.home-card--wide) .home-card__name {
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow-wrap: normal;
  }

  .home-card--wide {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'avatar text end'
      'foot foot foot';
    align-items: center;
    column-gap: var(--space-3);
    row-gap: var(--space-4);
  }

  .home-card--wide .home-card__top {
    display: contents;
  }

  .home-card--wide .home-card__top > :first-child {
    grid-area: avatar;
  }

  .home-card--wide .home-card__end {
    grid-area: end;
  }

  .home-card--wide .home-card__text {
    grid-area: text;
    margin-top: 0;
  }

  .home-card--wide .home-card__name,
  .home-card--wide .home-card__meta {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }

  .home-card--wide .home-card__foot {
    grid-area: foot;
    padding-top: 0;
  }
}
</style>
