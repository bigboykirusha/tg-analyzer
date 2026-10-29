<script setup lang="ts">
import { Plus } from '../lib/icons'

/**
 * Phones and tablets, home only: one lime «Новый анализ» pill floating above
 * the list. It slides away while you scroll down and comes back on the way up,
 * so it never sits on a number. Reports, /new and the account have a back
 * arrow in the header instead.
 */
const { t } = useI18n()
const route = useRoute()
const workspace = useWorkspaceStore()
const shown = computed(() => route.path === '/dashboard' && workspace.reports.length > 0)

const hidden = ref(false)
let lastY = 0
function onScroll() {
  const y = window.scrollY
  if (Math.abs(y - lastY) < 8) return
  hidden.value = y > lastY && y > 120
  lastY = y
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <nav v-if="shown" class="dock no-print" :class="{ 'is-hidden': hidden }" :aria-label="t('nav.tabs')">
    <NuxtLink to="/new" class="dock__new">
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
  transition: transform var(--duration-slow) var(--ease-standard);
}

.dock.is-hidden {
  transform: translate(-50%, calc(100% + var(--space-6) + env(safe-area-inset-bottom, 0px)));
}

/* Wide screens have the sidebar instead. */
@media (min-width: 901px) {
  .dock {
    display: none;
  }
}

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

.dock__new {
  gap: var(--space-2);
  padding: 0 var(--space-5) 0 var(--space-4);
  background: var(--lime);
  color: var(--on-lime);
  font: 600 15px/1 var(--font-sans);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.dock__new:active {
  transform: scale(var(--press-scale));
}
</style>
