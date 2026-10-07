<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'

const { preference, apply, hydrate } = useTheme()

onMounted(hydrate)

const isDark = computed(
  () =>
    preference.value === 'dark' ||
    (preference.value === 'system' && import.meta.client && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

function toggle() {
  apply(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <button class="theme-toggle" type="button" :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'" @click="toggle">
    <Sun v-if="isDark" :size="18" aria-hidden="true" />
    <Moon v-else :size="18" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--separator);
  border-radius: 50%;
  background: var(--surface-glass);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.theme-toggle:active {
  transform: scale(0.97);
}
</style>
