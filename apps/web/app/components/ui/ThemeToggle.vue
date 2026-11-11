<script setup lang="ts">
import { Moon, Sun } from '../../lib/icons'
import IconButton from './IconButton.vue'

/** The theme, as a round icon in the public header: the moon turns the dark one on, the sun the light one. */
const { preference, resolved, setPreference } = useTheme()
const { t } = useI18n()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
// The server cannot read the system preference: keep the server's icon during hydration, then follow the
// resolved theme without changing the button's size.
const isDark = computed(() => (mounted.value ? resolved.value : preference.value) === 'dark')
</script>

<template>
  <IconButton
    class="theme-toggle"
    :icon="isDark ? Sun : Moon"
    :label="isDark ? t('theme.light') : t('theme.dark')"
    size="sm"
    @click="setPreference(isDark ? 'light' : 'dark')"
  />
</template>
