<script setup lang="ts">
import type { Component } from 'vue'
import Button, { type ButtonSize, type ButtonVariant } from './Button.vue'
import Tooltip from './Tooltip.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Required: becomes aria-label and the tooltip. */
    label: string
    icon: Component
    variant?: ButtonVariant
    /** xs 32 (close) · sm 36 · md 44 · lg 48. */
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    /** Hide the tooltip, e.g. while the menu this button opens is shown. */
    noTooltip?: boolean
  }>(),
  {
    variant: 'ghost',
    size: 'md',
    loading: false,
    disabled: false,
    noTooltip: false,
  },
)

// Layout classes belong on the outer wrapper (it carries the parent's scope);
// everything else (aria-*, handlers, `to`) goes to the button.
const attrs = useAttrs()
// attrs are not reactive, so this runs on every render instead of being computed.
function buttonAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
}
</script>

<template>
  <Tooltip :class="attrs.class" :style="attrs.style" :text="label" :describe="false" :disabled="noTooltip">
    <Button
      v-bind="buttonAttrs()"
      icon-only
      :variant="variant"
      :size="size"
      :icon="icon"
      :loading="loading"
      :disabled="disabled"
      :aria-label="label"
    />
  </Tooltip>
</template>
