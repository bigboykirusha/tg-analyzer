<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Every page shares the header's column; `narrow` caps the content width for reading and settings, still left-aligned under the logo. */
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

.page-container--narrow > :deep(*) {
  max-width: var(--page-max-narrow);
}
</style>
