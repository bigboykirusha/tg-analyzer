<script setup lang="ts">
import { LayoutGrid, Plus, User } from '../lib/icons'

/**
 * Phones and tablets: the three places of the app under the thumb. The middle
 * one starts a new analysis and is lime, like every «new» action in the app.
 */
const { t } = useI18n()
const route = useRoute()

const tabs = computed(() => [
  {
    to: '/dashboard',
    label: t('nav.home'),
    icon: LayoutGrid,
    active: route.path === '/dashboard' || route.path.startsWith('/chat/'),
  },
  { to: '/new', label: t('nav.new'), icon: Plus, active: route.path === '/new', primary: true },
  { to: '/account', label: t('nav.account'), icon: User, active: route.path === '/account' },
])
</script>

<template>
  <nav class="tabs no-print" :aria-label="t('nav.tabs')">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tabs__item"
      :class="{ 'tabs__item--primary': tab.primary }"
      :aria-current="tab.active ? 'page' : undefined"
    >
      <span class="tabs__icon"><component :is="tab.icon" aria-hidden="true" /></span>
      <span class="tabs__label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.tabs {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-header);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 6px var(--space-4) max(6px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  background: var(--bg);
}

/* Wide screens have the sidebar instead. */
@media (min-width: 901px) {
  .tabs {
    display: none;
  }
}

.tabs__item {
  display: grid;
  justify-items: center;
  gap: 2px;
  min-height: 48px;
  padding-top: 4px;
  color: var(--text-faint);
  font: 500 11px/14px var(--font-sans);
  transition: color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.tabs__item[aria-current='page'] {
  color: var(--text);
}

.tabs__icon {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 28px;
  border-radius: var(--radius-full);
  transition:
    background-color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.tabs__item:active .tabs__icon {
  transform: scale(var(--press-scale));
}

.tabs__item[aria-current='page'] .tabs__icon {
  background: var(--surface);
}

.tabs__item--primary .tabs__icon,
.tabs__item--primary[aria-current='page'] .tabs__icon {
  background: var(--lime);
  color: var(--on-lime);
}

.tabs__item--primary {
  color: var(--text);
}
</style>
