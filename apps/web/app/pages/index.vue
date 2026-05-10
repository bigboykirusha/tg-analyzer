<script setup lang="ts">
const auth = useAuthStore()
const { bootstrap } = useAuth()
const { t } = useI18n()
const ready = ref(false)

onMounted(async () => {
  await bootstrap()
  ready.value = true
  await navigateTo(auth.isAuthorized ? '/dashboard' : '/login')
})
</script>

<template>
  <div class="redirect-screen">
    <span class="text-label">{{ ready ? t('common.redirecting') : t('common.loading') }}</span>
  </div>
</template>

<style scoped>
.redirect-screen {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  color: var(--text-secondary);
}
</style>
