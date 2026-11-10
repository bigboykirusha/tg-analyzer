<script setup lang="ts">
import { hueOf } from '../../lib/hue'

/**
 * The one card of the home screen: a person's avatar, their name, one quiet line, then what the card is
 * for — a pulse (a report), a button («Разобрать»), or nothing yet (a skeleton). White on the neutral
 * page like every card of the product; the person's colour is only their avatar and their half of the
 * pulse. With `to` the whole card opens the report, the end slot (a badge, the «⋯» menu) stays clickable.
 */
const props = defineProps<{
  chatId?: string
  title?: string
  /** The name the avatar's initials come from when the title says more than the name. */
  avatarTitle?: string
  hasAvatar?: boolean
  /** The quiet line under the name; wraps to two lines, never cut mid-word. */
  meta?: string
  to?: string
  skeleton?: boolean
}>()

const hue = computed(() => (props.chatId ? hueOf(props.chatId) : undefined))
</script>

<template>
  <article class="home-card" :data-hue="hue" :aria-busy="skeleton || undefined">
    <div class="home-card__top">
      <UiSkeleton v-if="skeleton" width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-full)" />
      <ChatAvatar v-else :chat-id="chatId!" :title="avatarTitle ?? title" :has-avatar="hasAvatar" />
      <div v-if="!skeleton" class="home-card__end"><slot name="end" /></div>
    </div>
    <div class="home-card__text">
      <template v-if="skeleton">
        <UiSkeleton width="70%" height="var(--space-4)" />
        <UiSkeleton width="50%" height="var(--space-3)" />
      </template>
      <template v-else>
        <NuxtLink v-if="to" :to="to" class="home-card__name t-label">{{ title }}</NuxtLink>
        <h3 v-else class="home-card__name t-label">{{ title }}</h3>
        <p class="home-card__meta t-caption">
          <slot name="meta">{{ meta }}</slot>
        </p>
      </template>
    </div>
    <div class="home-card__foot">
      <slot v-if="!skeleton" />
      <UiSkeleton v-else height="var(--space-6)" />
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
  color: var(--text);
  transition: transform var(--duration-press) var(--ease-standard);
}

.home-card:has(a.home-card__name):active:not(:has(.home-card__end :active)) {
  transform: scale(var(--press-scale-lg));
}

.home-card__top {
  display: flex;
  align-items: flex-start;
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
  gap: var(--space-1);
  min-width: 0;
}

/* The name is the card's link; it stretches over the whole card, the end slot sits above it. */
.home-card__name {
  display: -webkit-box;
  overflow: hidden;
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

/* A block, not a flex row: only a block can end its line with an ellipsis. */
.home-card__meta {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.home-card__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: auto;
  min-width: 0;
}
</style>
