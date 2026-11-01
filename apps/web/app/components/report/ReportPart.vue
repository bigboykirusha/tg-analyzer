<script setup lang="ts">
/**
 * One part of the long report page, a target for `ReportNav`. With `columns`
 * its cards fall into two independent columns, so a short card never stretches
 * to match a tall neighbour; the tabs inside then render their cards without a
 * wrapper of their own.
 */
defineProps<{ id: string; title: string; columns?: boolean }>()
</script>

<template>
  <section :id="`part-${id}`" class="report-part" :aria-labelledby="`part-${id}-title`">
    <h2 :id="`part-${id}-title`" class="t-h3">{{ title }}</h2>
    <div v-if="columns" class="report-columns"><slot /></div>
    <slot v-else />
  </section>
</template>

<style scoped>
.report-part {
  display: grid;
  gap: var(--space-4);
  scroll-margin-top: calc(var(--topbar-height) + 56px);
}
</style>
