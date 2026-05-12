<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

const { t } = useI18n()
</script>

<template>
  <div class="redirect-screen">
    <span class="text-label">{{ t('common.redirecting') }}</span>
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
