<script setup lang="ts">
import { Globe } from '../../lib/icons'

const { locale, setLocale, t } = useI18n()

function toggleLocale() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <div class="locale-switch">
    <Globe :size="16" aria-hidden="true" />
    <button type="button" :aria-label="t('nav.language')" @click="toggleLocale">
      {{ locale.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.locale-switch {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.locale-switch > svg {
  flex: 0 0 auto;
}

.locale-switch button {
  min-width: 28px;
  min-height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.locale-switch button:hover {
  color: var(--text-primary);
}

.locale-switch button:active {
  transform: scale(0.94);
}

.locale-switch button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
