<script setup lang="ts">
/** One part of the long report page, a target for `ReportNav`. */
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :id="`part-${id}`" class="report-part" :aria-label="title">
    <slot />
  </section>
</template>

<style scoped>
.report-part {
  display: grid;
  gap: var(--page-gap, var(--space-6));
  scroll-margin-top: calc(var(--topbar-height) + 56px);
}
</style>
