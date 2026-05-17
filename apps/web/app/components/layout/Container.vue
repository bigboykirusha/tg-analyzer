<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'narrow' | 'default' | 'full'
  as?: string
}>(), {
  size: 'default',
  as: 'div',
})

const classes = computed(() => [
  'ui-container',
  `ui-container-${props.size}`,
])
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
  max-width: 720px;
}

.ui-container-default {
  max-width: 1100px;
}

.ui-container-full {
  max-width: none;
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
    padding-inline: 0;
  }
}
</style>
