<script setup lang="ts">
import type { Component } from 'vue'
import Button from './Button.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label: string
    icon: Component
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'ghost',
    size: 'md',
    loading: false,
    disabled: false,
  },
)
</script>

<template>
  <Button
    v-bind="$attrs"
    icon-only
    :variant="variant"
    :size="size"
    :icon="icon"
    :loading="loading"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
  >
    <span class="sr-only">{{ label }}</span>
  </Button>
</template>
