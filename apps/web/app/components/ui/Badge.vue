<script setup lang="ts">
/**
 * A short label or count next to something: «Новое», «3», «+7». Caption type on a small rounded
 * well (--radius-xs). Tones: neutral (a grey well), lime (the other side, «new»), danger.
 */
withDefaults(defineProps<{ tone?: 'neutral' | 'lime' | 'danger' }>(), { tone: 'neutral' })
</script>

<template>
  <span class="badge" :class="`badge--${tone}`"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-0-5) var(--space-2);
  border-radius: var(--radius-xs);
  font: var(--text-caption);
  white-space: nowrap;
  --icon-size: var(--icon-sm);
}

/* The raised fill reads on a card and inside a menu in both themes. */
.badge--neutral {
  background: var(--fill-raised);
  color: var(--text-muted);
}

.badge--lime {
  background: var(--lime);
  color: var(--on-lime);
}

.badge--danger {
  background: var(--danger-subtle);
  color: var(--danger);
}
</style>
