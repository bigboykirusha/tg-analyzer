<script setup lang="ts">
import type { Component } from 'vue'

/**
 * A report card — the one anatomy of the report (docs/design-system.md): the question in a quiet label,
 * the answer (a few words in h2, or one big figure with a few words under it), one picture (the default
 * slot) and an optional footnote (`note`). Nothing else: no second size, no second weight.
 * `tone="ink"` paints the card in the person's poster colour (the guest page's word of the chat).
 * `icon` makes the question a topic label, as in Apple's Health: the icon in a small circle of the person's
 * colour and the topic in their ink — so a long report reads as topics at a glance.
 */
defineProps<{
  title?: string
  answer?: string | null
  /** One big number («×3,2»): the answer then says in a few words what it is the number of. */
  figure?: string | null
  wide?: boolean
  /** The first finding of a part: its answer in the larger h2; every other card answers in h3. */
  hero?: boolean
  tone?: 'ink'
  icon?: Component | null
}>()
</script>

<template>
  <article class="report-section tile" :class="{ 'report-section--wide': wide, 'tile--ink': tone === 'ink' }">
    <header v-if="title || answer || figure" class="report-section__head">
      <h3 v-if="title" class="t-label report-section__title" :class="{ 'report-section__title--topic': icon }">
        <span v-if="icon" class="report-section__icon" aria-hidden="true"><component :is="icon" /></span>
        {{ title }}
      </h3>
      <p v-if="figure" class="t-figure report-section__figure">{{ figure }}</p>
      <p v-if="answer" class="report-section__answer" :class="figure ? 't-body' : hero ? 't-h2' : 't-h3'">
        {{ answer }}
      </p>
    </header>
    <slot />
    <p v-if="$slots.note" class="t-label report-section__note"><slot name="note" /></p>
  </article>
</template>

<style scoped>
.report-section {
  min-width: 0;
}

.report-section__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.report-section__title,
.report-section__note {
  color: var(--text-muted);
}

.report-section__title--topic {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--them-ink);
}

.report-section__icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
  border-radius: var(--radius-pill);
  background: var(--them);
  color: var(--surface);
  --icon-size: var(--icon-sm);
}

.report-section__figure {
  overflow-wrap: anywhere;
}

.report-section__answer {
  text-wrap: balance;
}

.report-section__answer::first-letter {
  text-transform: uppercase;
}
</style>
