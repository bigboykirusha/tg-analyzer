<script setup lang="ts">
import Button from './Button.vue'

const { locale, setLocale, t } = useI18n()

function toggleLocale() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <span class="locale-switch">
    <Button variant="link" :aria-label="t('nav.language')" @click="toggleLocale">
      {{ locale.toUpperCase() }}
    </Button>
  </span>
</template>

<style scoped>
.locale-switch {
  display: inline-flex;
}

.locale-switch :deep(.btn) {
  color: var(--text-muted);
  text-decoration: none;
}
</style>
