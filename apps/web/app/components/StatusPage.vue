<script setup lang="ts">
/** Full-page states (not found, error, offline): a flat seismograph — nothing is being said here. */
defineProps<{ code: string; title: string; text: string; action: string }>()
defineEmits<{ action: [] }>()

const silence = Array.from({ length: 64 }, (_, index) =>
  index < 18 ? { sent: (index * 7) % 5, received: (index * 3) % 4 } : { sent: 0, received: 0 },
)
</script>

<template>
  <main class="status-page">
    <NuxtLink to="/" class="status-brand" aria-label="TG Analyzer"><BrandMark :size="30" /></NuxtLink>
    <section class="status-body" aria-labelledby="status-title">
      <p class="t-label">{{ code }}</p>
      <Seismograph :days="silence" :height="64" />
      <h1 id="status-title" class="t-h1">{{ title }}</h1>
      <p class="status-text">{{ text }}</p>
      <UiButton variant="primary" @click="$emit('action')">{{ action }}</UiButton>
    </section>
  </main>
</template>

<style scoped>
.status-page {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100dvh;
  padding: var(--space-5) var(--page-gutter) max(var(--space-10), env(safe-area-inset-bottom, 0px));
}

.status-brand {
  justify-self: start;
  border-radius: var(--radius-sm);
}

.status-body {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: var(--space-5);
  width: min(100%, 560px);
  margin: 0 auto;
}

.status-body :deep(.seismograph) {
  margin-block: var(--space-2);
}

.status-text {
  color: var(--text-muted);
}
</style>
