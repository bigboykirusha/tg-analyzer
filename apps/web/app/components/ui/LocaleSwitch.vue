<script setup lang="ts">
import { Globe } from '../../lib/icons'
import Button from './Button.vue'

const { locale, setLocale, t } = useI18n()

function toggleLocale() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <span class="locale-switch">
    <Button type="button" variant="ghost" size="sm" :icon="Globe" :aria-label="t('nav.language')" @click="toggleLocale">
      {{ locale.toUpperCase() }}
    </Button>
  </span>
</template>

<style scoped>
.locale-switch {
  display: inline-flex;
}

.locale-switch :deep(.btn) {
  padding-inline: var(--space-3);
}
</style>
