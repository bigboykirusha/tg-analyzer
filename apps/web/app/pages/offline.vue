<script setup lang="ts">
const { t } = useI18n()

function retry() {
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>

<template>
  <main class="offline-page">
    <section class="offline-card" aria-labelledby="offline-title">
      <span class="offline-mark" aria-hidden="true">⌁</span>
      <h1 id="offline-title" class="t-h1">{{ t('offline.title') }}</h1>
      <p class="t-body">{{ t('offline.text') }}</p>
      <UiButton variant="primary" @click="retry">{{ t('offline.retry') }}</UiButton>
    </section>
  </main>
</template>

<style scoped>
.offline-page {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: var(--space-4);
}
.offline-card {
  display: grid;
  justify-items: center;
  width: min(100%, 460px);
  gap: var(--space-4);
  padding: clamp(var(--space-5), 7vw, var(--space-10));
  border-radius: var(--radius-xl);
  background: var(--glass);
  box-shadow: var(--shadow);
  text-align: center;
  backdrop-filter: blur(var(--blur-glass)) saturate(1.4);
}
.offline-card p {
  color: var(--text-muted);
}
.offline-mark {
  color: var(--accent-2);
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
}
</style>
