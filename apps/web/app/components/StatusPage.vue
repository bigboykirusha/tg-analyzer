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
    <NuxtLink to="/" class="status-brand"><BrandMark />TG Analyzer</NuxtLink>
    <section class="status-body" aria-labelledby="status-title">
      <div class="status-tile">
        <p class="status-code">{{ code }}</p>
        <Seismograph :days="silence" :height="64" />
      </div>
      <h1 id="status-title" class="status-title">{{ title }}</h1>
      <p class="status-text">{{ text }}</p>
      <UiButton variant="primary" size="lg" @click="$emit('action')">{{ action }}</UiButton>
    </section>
  </main>
</template>

<style scoped>
.status-page {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100dvh;
  padding: var(--space-4) var(--page-gutter) max(var(--space-10), env(safe-area-inset-bottom, 0px));
}

.status-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-self: start;
  font: 600 16px/1 var(--font-sans);
  letter-spacing: -0.02em;
}

.status-body {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--space-4);
  width: min(100%, 440px);
  margin: 0 auto;
  text-align: center;
}

/* The ink tile from the report: a flat line where the messages should be. */
.status-tile {
  --you: var(--on-tile-ink);
  --them: var(--them-on-ink);
  --border-strong: var(--on-tile-ink-muted);

  display: grid;
  gap: var(--space-4);
  width: 100%;
  margin-bottom: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-card);
  background: var(--tile-ink);
  color: var(--on-tile-ink);
  text-align: left;
}

.status-code {
  color: var(--on-tile-ink-muted);
  font: var(--text-ui);
}

.status-title {
  font: 600 clamp(28px, 7vw, 36px) / 1.1 var(--font-sans);
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.status-text {
  max-width: 36ch;
  color: var(--text-muted);
  text-wrap: pretty;
}

.status-body .btn {
  margin-top: var(--space-2);
}
</style>
