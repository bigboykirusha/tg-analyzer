<script setup lang="ts">
/**
 * Three favourites on a podium: first place in the middle and tallest, the emoji over its step, how many
 * times under it. The first step is the side's ink — yours black, the other side's (or a group's) their
 * colour; the other two are quiet. `who` names whose podium it is when two stand side by side.
 */
const props = withDefaults(
  defineProps<{ items: { value: string; count: number }[]; tone?: 'mine' | 'theirs'; who?: string }>(),
  { tone: 'theirs', who: '' },
)
const { formatNumber } = useI18n()

/** Second, first, third — the order of a real podium. */
const steps = computed(() => {
  const [first, second, third] = props.items
  return [second && { ...second, place: 2 }, first && { ...first, place: 1 }, third && { ...third, place: 3 }].filter(
    (step): step is { value: string; count: number; place: number } => Boolean(step),
  )
})
</script>

<template>
  <figure class="podium" :class="`podium--${tone}`">
    <ol class="podium__steps">
      <li v-for="step in steps" :key="step.value" class="podium__step" :class="`podium__step--${step.place}`">
        <span class="podium__emoji">{{ step.value }}</span>
        <i class="podium__bar" aria-hidden="true" />
        <b class="podium__count">{{ formatNumber(step.count) }}</b>
      </li>
    </ol>
    <figcaption v-if="who" class="podium__who">{{ who }}</figcaption>
  </figure>
</template>

<style scoped>
.podium {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.podium__steps {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-1);
  width: 100%;
}

.podium__step {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  max-width: var(--space-16);
}

.podium__emoji {
  font: var(--text-h2);
}

/* Steps of a real podium: the winner tallest, second and third lower. */
.podium__bar {
  width: 100%;
  height: var(--space-12);
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  background: var(--surface-2);
}

.podium__step--1 .podium__bar {
  height: calc(var(--space-16) + var(--space-4));
  background: var(--you);
}

.podium__step--3 .podium__bar {
  height: var(--space-10);
}

.podium--theirs .podium__bar {
  background: var(--room-tint);
}

.podium--theirs .podium__step--1 .podium__bar {
  background: var(--them);
}

.podium__count {
  font: var(--text-label);
}

.podium__who {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium--theirs .podium__who {
  color: var(--them-ink);
}
</style>
