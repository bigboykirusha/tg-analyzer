<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'
import IconButton from './IconButton.vue'

const { resolved, setPreference } = useTheme()
const { t } = useI18n()
const isDark = computed(() => resolved.value === 'dark')

function toggle() {
  setPreference(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <IconButton
    class="theme-toggle"
    :icon="isDark ? Sun : Moon"
    :label="isDark ? t('theme.light') : t('theme.dark')"
    :aria-pressed="isDark"
    variant="ghost"
    size="sm"
    @click="toggle"
  />
</template>
