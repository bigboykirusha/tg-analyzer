<script setup lang="ts">
/** Full-page states (not found, error, offline) inside the site frame: a flat seismograph — nothing is being said here. */
defineProps<{ code: string; title: string; text: string; action: string }>()
defineEmits<{ action: [] }>()

const silence = Array.from({ length: 64 }, (_, index) =>
  index < 18 ? { sent: (index * 7) % 5, received: (index * 3) % 4 } : { sent: 0, received: 0 },
)
</script>

<template>
  <UiPageContainer class="status-page">
    <section class="status-body" aria-labelledby="status-title">
      <div class="status-tile">
        <p class="status-code">{{ code }}</p>
        <Seismograph :days="silence" :height="64" />
      </div>
      <h1 id="status-title" class="t-h2">{{ title }}</h1>
      <p class="t-lede status-text">{{ text }}</p>
      <UiButton variant="primary" size="lg" @click="$emit('action')">{{ action }}</UiButton>
    </section>
  </UiPageContainer>
</template>

<style scoped>
.status-page {
  display: grid;
  flex: 1;
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

.status-text {
  max-width: 36ch;
}

.status-body .btn {
  margin-top: var(--space-2);
}
</style>
