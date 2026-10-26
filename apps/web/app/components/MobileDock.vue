<script setup lang="ts">
import { LayoutGrid, Plus } from '../lib/icons'

/**
 * Phones and tablets: a small ink capsule floating above the content instead
 * of a full-width tab bar. Home on the left, the lime «new analysis» action on
 * the right; the account lives behind the avatar in the header.
 */
const { t } = useI18n()
const route = useRoute()
const homeActive = computed(() => route.path === '/dashboard' || route.path.startsWith('/chat/'))
const newActive = computed(() => route.path === '/new')
</script>

<template>
  <nav class="dock no-print" :aria-label="t('nav.tabs')">
    <NuxtLink
      to="/dashboard"
      class="dock__home"
      :aria-label="t('nav.home')"
      :aria-current="homeActive ? 'page' : undefined"
    >
      <LayoutGrid aria-hidden="true" />
    </NuxtLink>
    <NuxtLink to="/new" class="dock__new" :aria-current="newActive ? 'page' : undefined">
      <Plus aria-hidden="true" />
      <span>{{ t('nav.newAnalysis') }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.dock {
  position: fixed;
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: var(--radius-full);
  background: var(--tile-ink);
  box-shadow: var(--shadow-overlay);
  transform: translateX(-50%);
}

/* Wide screens have the sidebar instead. */
@media (min-width: 901px) {
  .dock {
    display: none;
  }
}

.dock__home,
.dock__new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  border-radius: var(--radius-full);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
  -webkit-tap-highlight-color: transparent;
}

.dock__home {
  width: 46px;
  color: var(--on-tile-ink-muted);
}

.dock__home[aria-current='page'] {
  color: var(--on-tile-ink);
}

.dock__new {
  gap: var(--space-2);
  padding: 0 var(--space-5) 0 var(--space-4);
  background: var(--lime);
  color: var(--on-lime);
  font: 600 15px/1 var(--font-sans);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.dock__home:active,
.dock__new:active {
  transform: scale(var(--press-scale));
}
</style>
