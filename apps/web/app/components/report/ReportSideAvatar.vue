<script setup lang="ts">
/**
 * One side of a two-person report as a 24 px avatar: «Я» in ink for you, the first letter of the
 * name for the other side. On a lime tile both sit on lime wells so the circle stays visible.
 */
const props = defineProps<{ side: 'mine' | 'theirs'; name: string }>()
const { t } = useI18n()
const letter = computed(() =>
  props.side === 'mine' ? t('report.youInitial') : (Array.from(props.name.trim())[0]?.toUpperCase() ?? '?'),
)
</script>

<template>
  <span class="side-avatar" :class="`side-avatar--${side}`" :title="side === 'mine' ? t('report.you') : name">
    {{ letter }}
  </span>
</template>

<!-- Not scoped: the lime-tile variant needs the tile as an ancestor; the class names are unique. -->
<style>
.side-avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  font: var(--text-caption);
}

.side-avatar--mine {
  background: var(--you);
  color: var(--surface);
}

.side-avatar--theirs {
  background: var(--avatar-1-bg);
  color: var(--avatar-1-ink);
}

.tile--lime .side-avatar--mine {
  color: var(--lime);
}

/* On ink «Я» is a light circle: the letter takes the tile's colour. */
.tile--ink .side-avatar--mine {
  color: var(--tile-ink);
}

.tile--lime .side-avatar--theirs {
  background: var(--on-lime-well);
  color: var(--on-lime);
}
</style>
