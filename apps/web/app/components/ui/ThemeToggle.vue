<script setup lang="ts">
/** The other theme, as a word in the footer: «Тёмная тема» in the light one and back. */
const { preference, resolved, setPreference } = useTheme()
const { t } = useI18n()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
// The server cannot read the system preference: keep the server's word during hydration, then follow the
// resolved theme.
const isDark = computed(() => (mounted.value ? resolved.value : preference.value) === 'dark')
</script>

<template>
  <button type="button" class="theme-toggle" @click="setPreference(isDark ? 'light' : 'dark')">
    {{ isDark ? t('theme.light') : t('theme.dark') }}
  </button>
</template>

<style scoped>
.theme-toggle {
  font: inherit;
}
</style>
