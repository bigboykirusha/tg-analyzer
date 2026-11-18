<script setup lang="ts">
import type { Component } from 'vue'

/**
 * A report finding with a topic, an answer, supporting content and an optional note.
 * Lead findings and charts sit on cards. Tables and lists can sit directly in the chapter.
 * `tone="ink"` gives a framed finding the person's poster material.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    answer?: string | null
    /** One big number («×3,2»): the answer then says in a few words what it is the number of. */
    figure?: string | null
    wide?: boolean
    /** The first finding of a part: its answer in the larger h2; other findings answer in h3. */
    hero?: boolean
    appearance?: 'card' | 'inline'
    tone?: 'ink'
    icon?: Component | null
  }>(),
  { title: '', answer: null, figure: null, appearance: 'card', tone: undefined, icon: null },
)
const framed = computed(() => props.appearance === 'card')
</script>

<template>
  <article
    tabindex="-1"
    class="report-section"
    :class="{ 'report-section--wide': wide, tile: framed, 'tile--ink': framed && tone === 'ink' }"
  >
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

/* The topic's glyph, bare, in the person's ink: it names the theme without a badge around it. */
.report-section__icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  color: var(--them-ink);
  --icon-size: var(--icon-md);
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
