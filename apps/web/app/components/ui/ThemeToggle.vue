<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'

const { preference, apply, hydrate } = useTheme()
const { t } = useI18n()
const mounted = ref(false)

onMounted(() => {
  hydrate()
  mounted.value = true
})

const isDark = computed(
  () =>
    preference.value === 'dark' ||
    (mounted.value && preference.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

function toggle() {
  apply(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <button
    class="theme-toggle interactive-surface"
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
  border: 1px solid var(--separator);
  border-radius: 50%;
  background: var(--glass-sheen), var(--surface-glass);
  color: var(--text-primary);
  cursor: pointer;
  overflow: hidden;
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
