<script setup lang="ts">
defineProps<{ label?: string; title: string; text?: string; wide?: boolean }>()
</script>

<template>
  <article class="card report-section" :class="{ 'report-section--wide': wide }">
    <header class="report-section__head">
      <div class="report-section__copy">
        <span v-if="label" class="t-label">{{ label }}</span>
        <h2 class="t-h2">{{ title }}</h2>
        <p v-if="text" class="report-section__text">{{ text }}</p>
      </div>
      <div v-if="$slots.actions" class="report-section__actions no-print">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.report-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-6);
  overflow: hidden;
}

.report-section--wide {
  grid-column: 1 / -1;
}

.report-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.report-section__copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  max-width: 560px;
}

.report-section__text {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
  overflow-wrap: anywhere;
}
</style>
