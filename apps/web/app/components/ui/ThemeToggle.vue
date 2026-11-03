<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'
import IconButton from './IconButton.vue'

const { preference, resolved, setPreference } = useTheme()
const { t } = useI18n()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
// The server cannot read the system preference. Keep the initial icon identical
// during hydration, then follow the resolved theme without changing button size.
const isDark = computed(() => (mounted.value ? resolved.value : preference.value) === 'dark')

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
