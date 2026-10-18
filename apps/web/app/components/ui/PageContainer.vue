<script setup lang="ts">
withDefaults(
  defineProps<{
    /** `narrow` for reading pages (terms); everything else shares the header's column. */
    size?: 'narrow' | 'default'
    as?: string
  }>(),
  { size: 'default', as: 'div' },
)
</script>

<template>
  <component :is="as" class="page-container" :class="{ 'page-container--narrow': size === 'narrow' }">
    <slot />
  </component>
</template>

<style scoped>
.page-container {
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin-inline: auto;
  padding-inline: var(--page-gutter);
}

.page-container--narrow {
  max-width: calc(var(--page-max-narrow) + var(--page-gutter) * 2);
}
</style>
