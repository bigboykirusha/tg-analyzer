<script setup lang="ts">
const { locale, setLocale, t } = useI18n()

function toggleLocale() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <button class="locale-switch" type="button" :aria-label="t('nav.language')" @click="toggleLocale">
    {{ locale.toUpperCase() }}
  </button>
</template>

<style scoped>
.locale-switch {
  display: inline-grid;
  width: 42px;
  height: 42px;
  place-items: center;
  align-items: center;
  padding: 0;
  border: 1px solid var(--separator);
  border-radius: var(--radius-full);
  background: var(--glass-sheen), var(--surface-glass);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  font: inherit;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.locale-switch:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.locale-switch:active {
  transform: scale(0.94);
}

.locale-switch:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
