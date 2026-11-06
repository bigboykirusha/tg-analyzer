<script setup lang="ts">
/** The logo and the name: the same in every header and in the sidebar. */
withDefaults(defineProps<{ to?: string }>(), { to: '/' })
</script>

<template>
  <NuxtLink :to="to" class="brand-link" aria-label="TG Analyzer">
    <BrandMark :size="36" />
    <span class="brand-link__name">TG Analyzer</span>
  </NuxtLink>
</template>

<style scoped>
.brand-link {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: var(--text-title);
  letter-spacing: var(--tracking-h3);
  white-space: nowrap;
}
</style>
