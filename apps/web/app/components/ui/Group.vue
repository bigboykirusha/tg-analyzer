<script setup lang="ts">
/**
 * A grouped list, as in iOS settings: an optional quiet heading above, white rows inside, an optional
 * note under it. Rows are UiListRow; anything else (a switch row, a field) fits too.
 */
defineProps<{ header?: string; footer?: string }>()
</script>

<template>
  <section class="group">
    <h2 v-if="header || $slots.header" class="group__header">
      <slot name="header">{{ header }}</slot>
    </h2>
    <div class="group__card"><slot /></div>
    <p v-if="footer || $slots.footer" class="group__footer">
      <slot name="footer">{{ footer }}</slot>
    </p>
  </section>
</template>

<style scoped>
.group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.group__header {
  padding: 0 var(--space-4) var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.group__card {
  --btn-secondary-bg: transparent;
  --btn-tinted-bg: var(--surface-2);
  padding: 0 var(--group-padding, var(--space-4));
  border-radius: var(--radius-md);
  background: var(--group-bg, var(--surface));
}

/* The last row has no hairline, whatever wraps it (a menu, a transition). */
.group__card > :deep(:last-child .list-row__body),
.group__card > :deep(:last-child .switch-row__body) {
  box-shadow: none;
}

.group__footer {
  padding: var(--space-2) var(--space-4) 0;
  color: var(--text-muted);
  font: var(--text-small);
}

@media (min-width: 901px) {
  .group__card {
    padding: 0 var(--group-padding, var(--space-6));
    border-radius: var(--radius-lg);
  }

  .group__header,
  .group__footer {
    padding-inline: var(--space-6);
  }
}
</style>
