<script setup lang="ts">
/** One part of the report on phones, where all parts follow each other on one page. */
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :id="`report-part-${id}`" class="report-part" :aria-label="title">
    <h2 class="report-part__title">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.report-part {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-3);
  /* Clears the header and the pinned section bar when jumped to. */
  scroll-margin-top: calc(var(--topbar-height) + 60px);
}

.report-part + .report-part {
  margin-top: var(--space-4);
}

.report-part__title {
  padding-inline: var(--space-1);
  font: var(--text-title);
  font-size: 22px;
  line-height: 28px;
  letter-spacing: -0.01em;
}
</style>
