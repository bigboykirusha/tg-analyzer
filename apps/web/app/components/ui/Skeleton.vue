<script setup lang="ts">
withDefaults(defineProps<{
  width?: string
  height?: string
  radius?: string
}>(), {
  width: '100%',
  height: '1rem',
  radius: 'var(--radius-sm)',
})
</script>

<template>
  <div class="skeleton" :style="{ width, height, borderRadius: radius }" />
</template>
