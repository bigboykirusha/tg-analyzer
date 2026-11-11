<script setup lang="ts">
/**
 * A grouped list, as in iOS settings: an optional quiet heading above, rows inside a card, an optional note
 * under it. Rows are UiListRow or UiSwitch; anything else that sits in the card keeps the rows' inset itself.
 *
 * The card has no padding of its own: a row runs from edge to edge, its text starts `--row-inset` in (the card
 * padding), the hairline runs from the text to the card's edge, and a row's hover or press fills the whole row —
 * the first and last rows take the card's corners. So a card is exactly its rows: one row, one 56 strip, with
 * nothing uneven above or below it. Heading and note start where the rows' text does.
 *
 * In a sheet or a dialog (`--group-bleed`, `--group-radius: 0`) the list sits straight on the sheet and its rows
 * run to the sheet's edges.
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
  --row-inset: var(--group-inset, var(--card-padding));
  --row-fill-inset: 0;
  --row-fill-radius: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-inline: calc(-1 * var(--group-bleed, 0px));
}

.group__header {
  padding: 0 var(--row-inset) var(--space-2);
  color: var(--text-muted);
  font: var(--text-label);
}

.group__card {
  border-radius: var(--group-radius, var(--radius-card));
  background: var(--group-bg, var(--surface));
}

/* The fill of the first and last rows follows the card's corners (the card cannot clip: menus open from rows). */
.group__card > :deep(:first-child) {
  --row-fill-radius: var(--group-radius, var(--radius-card)) var(--group-radius, var(--radius-card)) 0 0;
}

.group__card > :deep(:last-child) {
  --row-fill-radius: 0 0 var(--group-radius, var(--radius-card)) var(--group-radius, var(--radius-card));
}

.group__card > :deep(:only-child) {
  --row-fill-radius: var(--group-radius, var(--radius-card));
}

/* The last row has no hairline, whatever wraps it (a menu, a transition). */
.group__card > :deep(:last-child .list-row__body),
.group__card > :deep(:last-child .switch-row__body),
.group__card > :deep(.list-row:last-child .list-row__body) {
  box-shadow: none;
}

.group__footer {
  padding: var(--space-2) var(--row-inset) 0;
  color: var(--text-muted);
  font: var(--text-label);
}
</style>
