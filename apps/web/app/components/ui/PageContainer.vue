<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'narrow' | 'default' | 'wide'
    as?: string
  }>(),
  {
    size: 'default',
    as: 'div',
  },
)

const classes = computed(() => ['page-container', `page-container-${props.size}`])
</script>

<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>

<style scoped>
.page-container {
  width: 100%;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

.page-container-narrow {
  max-width: calc(720px + var(--space-8) * 2);
}

.page-container-default {
  max-width: calc(800px + var(--space-8) * 2);
}

.page-container-wide {
  max-width: calc(1000px + var(--space-8) * 2);
}

@media (min-width: 768px) {
  .page-container {
    padding-inline: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .page-container {
    padding-inline: var(--space-8);
  }
}

@media (max-width: 768px) {
  .page-container {
    padding-inline: var(--space-4);
  }
}
</style>
