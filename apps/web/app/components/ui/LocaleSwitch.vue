<script setup lang="ts">
import { Globe } from '../../lib/icons'

const { locale, setLocale, t } = useI18n()
</script>

<template>
  <div class="locale-switch" role="group" :aria-label="t('nav.language')">
    <Globe :size="16" aria-hidden="true" />
    <button type="button" :class="{ active: locale === 'ru' }" :aria-pressed="locale === 'ru'" @click="setLocale('ru')">
      RU
    </button>
    <span aria-hidden="true">/</span>
    <button type="button" :class="{ active: locale === 'en' }" :aria-pressed="locale === 'en'" @click="setLocale('en')">
      EN
    </button>
  </div>
</template>

<style scoped>
.locale-switch {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.locale-switch > svg {
  margin-right: 2px;
}

.locale-switch button {
  display: inline-grid;
  min-width: 34px;
  min-height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.locale-switch button:hover:not(.active) {
  background: var(--surface-2);
  color: var(--text-primary);
}

.locale-switch button.active {
  color: var(--text-primary);
}

.locale-switch button:active {
  transform: scale(0.94);
}

.locale-switch button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (max-width: 768px) {
  .locale-switch button {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
