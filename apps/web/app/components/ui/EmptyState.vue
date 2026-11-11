<script setup lang="ts">
import type { Component } from 'vue'
import { MessageSquare } from '../../lib/icons'

/**
 * Nothing here yet, or something failed. Two shapes, by where it stands:
 *
 * compact — inside a section or a sheet, in the place of the content that is missing: one calm card, a row —
 *   the symbol in a soft well, one line saying what happened and one quiet line on what to do, the action at
 *   the end (under the text on a phone). A message, not a second heading under the section's.
 * full — the whole screen has nothing to show (no report, no such chat): centred in the free space, as iOS's
 *   «content unavailable» — the symbol in a well, the title, one line, the action.
 *
 * Danger tone colours only the symbol and its well, never the text.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string | null
    icon?: Component | null
    tone?: 'neutral' | 'danger'
    /** Inside a section or a sheet: the row card. */
    compact?: boolean
  }>(),
  { description: null, icon: null, tone: 'neutral', compact: false },
)
</script>

<template>
  <div
    class="empty"
    :class="compact ? 'empty--compact' : 'empty--full'"
    :data-tone="tone"
    :role="tone === 'danger' ? 'alert' : undefined"
  >
    <span class="empty__icon" aria-hidden="true">
      <slot name="icon"><component :is="icon ?? MessageSquare" /></slot>
    </span>
    <div class="empty__copy">
      <h2 class="empty__title">{{ title }}</h2>
      <p v-if="description" class="empty__text">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="empty__action"><slot name="action" /></div>
  </div>
</template>

<style scoped>
.empty__icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-muted);
}

.empty__icon :deep(svg) {
  --icon-size: var(--icon-md);
}

.empty[data-tone='danger'] .empty__icon {
  background: var(--danger-subtle);
  color: var(--danger);
}

.empty__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.empty__text {
  color: var(--text-muted);
}

/* ─── compact: one row card in the place of the missing content ─── */

.empty--compact {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  /* In a sheet the card is the sheet itself. */
  background: var(--group-bg, var(--surface));
}

.empty--compact .empty__title {
  font: var(--text-body);
}

.empty--compact .empty__text {
  font: var(--text-label);
}

/* A phone: the action under the text, on the text's edge; the symbol stays by the title. */
@media (max-width: 640px) {
  .empty--compact {
    align-items: start;
  }

  .empty--compact .empty__action {
    grid-column: 2;
  }
}

/* ─── full: the screen's only content, centred in the free space ─── */

.empty--full {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  min-height: 50svh;
  margin-inline: auto;
  max-width: var(--card-focus);
  padding-block: var(--space-12);
  text-align: center;
}

.empty--full .empty__icon {
  width: var(--avatar-lg);
  height: var(--avatar-lg);
}

.empty--full .empty__icon :deep(svg) {
  --icon-size: var(--icon-xl);
}

.empty--full .empty__copy {
  gap: var(--space-2);
}

.empty--full .empty__title {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.empty--full .empty__text {
  font: var(--text-body);
  text-wrap: pretty;
}

.empty--full .empty__action {
  margin-top: var(--space-2);
}
</style>
