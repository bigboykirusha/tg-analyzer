<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'narrow' | 'default' | 'full'
    as?: string
  }>(),
  {
    size: 'default',
    as: 'div',
  },
)

const classes = computed(() => ['ui-container', `ui-container-${props.size}`])
</script>

<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>

<style scoped>
.ui-container {
  width: 100%;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

.ui-container-narrow {
  max-width: calc(720px + var(--space-8) * 2);
}

.ui-container-default {
  max-width: calc(800px + var(--space-8) * 2);
}

.ui-container-full {
  max-width: calc(1000px + var(--space-8) * 2);
}

@media (min-width: 768px) {
  .ui-container {
    padding-inline: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .ui-container {
    padding-inline: var(--space-8);
  }
}

@media (max-width: 768px) {
  .ui-container {
    padding-inline: var(--space-4);
  }
}
</style>
