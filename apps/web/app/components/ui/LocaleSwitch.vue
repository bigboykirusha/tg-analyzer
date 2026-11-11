<script setup lang="ts">
import type { Locale } from '../../composables/useI18n'
import { Globe } from '../../lib/icons'
import IconButton from './IconButton.vue'

/** The language, as a round icon in the public header: switches to the other one («English» on the Russian site). */
const { locale, setLocale, t } = useI18n()
const other = computed<{ code: Locale; label: string }>(() =>
  locale.value === 'ru' ? { code: 'en', label: 'English' } : { code: 'ru', label: 'Русский' },
)
</script>

<template>
  <IconButton
    class="locale-switch"
    :icon="Globe"
    :label="`${t('nav.language')}: ${other.label}`"
    size="sm"
    plain
    @click="setLocale(other.code)"
  />
</template>
