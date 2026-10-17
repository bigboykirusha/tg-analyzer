<script setup lang="ts">
defineProps<{ label?: string; title: string; text?: string; wide?: boolean }>()
</script>

<template>
  <article class="card report-section" :class="{ 'report-section--wide': wide }">
    <header class="section-copy">
      <span v-if="label" class="t-label">{{ label }}</span>
      <h2 class="t-h2">{{ title }}</h2>
      <p v-if="text" class="t-small">{{ text }}</p>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.report-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-5);
  overflow: hidden;
}

.report-section--wide {
  grid-column: 1 / -1;
}
</style>
