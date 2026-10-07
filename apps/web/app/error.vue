<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string; message?: string } }>()
const { t } = useI18n()
const title = computed(() => (props.error.statusCode === 404 ? t('error.notFoundTitle') : t('error.title')))
const message = computed(() => (props.error.statusCode === 404 ? t('error.notFoundText') : t('error.text')))

function retry() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <main class="error-page">
    <section class="error-card" aria-labelledby="error-title">
      <span class="error-code">{{ error.statusCode || 500 }}</span>
      <h1 id="error-title" class="t-h1">{{ title }}</h1>
      <p class="t-body">{{ message }}</p>
      <UiButton variant="primary" @click="retry">{{ t('error.backHome') }}</UiButton>
    </section>
  </main>
</template>

<style scoped>
.error-page {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: max(var(--space-5), env(safe-area-inset-top)) var(--space-4);
}
.error-card {
  display: grid;
  width: min(100%, 480px);
  gap: var(--space-4);
  padding: clamp(var(--space-5), 6vw, var(--space-10));
  border-radius: var(--radius-xl);
  background: var(--surface-glass);
  box-shadow: var(--shadow-lg);
  text-align: center;
  backdrop-filter: blur(var(--blur-md));
}
.error-card p {
  color: var(--text-secondary);
}
.error-card :deep(.btn) {
  justify-self: center;
}
.error-code {
  color: var(--accent);
  font-size: clamp(3.5rem, 15vw, 7rem);
  font-weight: 750;
  letter-spacing: -0.06em;
  line-height: 0.9;
}
</style>
