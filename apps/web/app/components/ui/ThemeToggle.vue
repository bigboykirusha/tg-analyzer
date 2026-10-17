<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'

const { resolved, setPreference } = useTheme()
const { t } = useI18n()
const isDark = computed(() => resolved.value === 'dark')

function toggle() {
  setPreference(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="isDark ? t('theme.light') : t('theme.dark')"
    :aria-pressed="isDark"
    @click="toggle"
  >
    <Sun class="theme-icon theme-icon-sun" :class="{ active: isDark }" :size="18" aria-hidden="true" />
    <Moon class="theme-icon theme-icon-moon" :class="{ active: !isDark }" :size="18" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--glass-sheen), var(--glass);
  color: var(--text);
  cursor: pointer;
  overflow: hidden;
  transition: transform var(--transition-fast);
}

.theme-toggle:active {
  transform: scale(0.94);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.theme-icon {
  position: absolute;
  opacity: 0;
  transform: rotate(-45deg) scale(0.7);
  transition:
    opacity var(--transition-normal),
    transform var(--transition-slow);
}

.theme-icon.active {
  opacity: 1;
  transform: rotate(0) scale(1);
}
</style>
