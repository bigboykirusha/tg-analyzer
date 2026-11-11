<script setup lang="ts">
import type { Locale } from '../../composables/useI18n'

/** The other language, by its own name, as a word in the footer: «English» on the Russian site and back. */
const { locale, setLocale, t } = useI18n()
const other = computed<{ code: Locale; label: string }>(() =>
  locale.value === 'ru' ? { code: 'en', label: 'English' } : { code: 'ru', label: 'Русский' },
)
</script>

<template>
  <button
    type="button"
    class="locale-switch"
    :lang="other.code"
    :aria-label="`${t('nav.language')}: ${other.label}`"
    @click="setLocale(other.code)"
  >
    {{ other.label }}
  </button>
</template>

<style scoped>
.locale-switch {
  font: inherit;
}
</style>
