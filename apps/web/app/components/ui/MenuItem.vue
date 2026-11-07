<script setup lang="ts">
import type { Component } from 'vue'
import Badge from './Badge.vue'
import ListRow from './ListRow.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: Component | null
    /** Current value, shown as a badge on the right. */
    meta?: string | null
    /** Destructive item: last, after a divider; end the label with «…» if a confirmation follows. */
    danger?: boolean
    disabled?: boolean
  }>(),
  {
    icon: null,
    meta: null,
    danger: false,
    disabled: false,
  },
)
</script>

<template>
  <ListRow
    v-bind="$attrs"
    as="button"
    size="sm"
    class="menu-item"
    :class="{ 'menu-item--icon': icon }"
    :danger="danger"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
  >
    <template v-if="icon" #leading>
      <component :is="icon" class="menu-item__icon row-icon" aria-hidden="true" />
    </template>
    <slot />
    <template v-if="meta" #trailing>
      <Badge class="menu-item__meta">{{ meta }}</Badge>
    </template>
  </ListRow>
</template>

<style scoped>
/* A row with an icon tile sits closer to the panel edge, so the tile and the text both line up. */
.menu-item--icon {
  --row-px: var(--space-2);
}
</style>
