<script setup lang="ts">
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :id="`chapter-${id}`" class="report-part" :aria-labelledby="`chapter-${id}-title`">
    <h2 :id="`chapter-${id}-title`" class="t-h2 report-part__title">{{ title }}</h2>
    <div class="report-part__blocks"><slot /></div>
  </section>
</template>

<style scoped>
.report-part__title {
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
</style>
