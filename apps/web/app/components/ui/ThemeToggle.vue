<script setup lang="ts">
import Button from './Button.vue'

const { preference, resolved, setPreference } = useTheme()
const { t } = useI18n()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
// The server cannot read the system preference. Keep the initial label identical
// during hydration, then follow the resolved theme.
const isDark = computed(() => (mounted.value ? resolved.value : preference.value) === 'dark')

function toggle() {
  setPreference(isDark.value ? 'light' : 'dark')
}
</script>

<template>
  <Button class="theme-toggle" variant="link" :aria-pressed="isDark" @click="toggle">
    {{ isDark ? t('theme.light') : t('theme.dark') }}
  </Button>
</template>

<style scoped>
.theme-toggle.btn {
  color: var(--text-muted);
  text-decoration: none;
}
</style>
