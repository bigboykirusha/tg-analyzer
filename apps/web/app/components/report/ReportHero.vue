<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The top of every report: an ink tile with the message count and the pulse,
 * one lime tile with the headline comparison, then small number tiles.
 */
defineProps<{ data: ReportDto; label: string; value: string; note?: string | null }>()
</script>

<template>
  <div class="bento hero">
    <section class="tile tile--ink span-8 hero__main">
      <div class="tile__label">{{ label }}</div>
      <div class="tile__figure">{{ value }}</div>
      <div v-if="note" class="tile__note">{{ note }}</div>
      <ReportPulse :data="data" bare class="hero__pulse" />
    </section>
    <section class="tile tile--lime span-4 hero__accent">
      <slot name="accent" />
    </section>
    <slot />
  </div>
</template>

<style scoped>
.hero__pulse {
  margin-top: auto;
  padding-top: var(--space-3);
}

.hero__accent {
  justify-content: space-between;
}
</style>
