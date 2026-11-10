<script setup lang="ts">
import { Share } from '../../lib/icons'

/**
 * The shape of a report while it loads, under the poster's own loading shape: two cards with the lines of
 * the one anatomy — a label, an answer, a picture — each at the exact height of the text it stands for
 * (`1lh` in that text's font), so nothing moves when the report arrives.
 */
defineProps<{ title?: string | null }>()
const { t } = useI18n()
</script>

<template>
  <div class="skeleton-report" aria-hidden="true">
    <UiPageBar :title="title ?? ''" back="/dashboard" bar>
      <template #actions>
        <UiIconButton class="skeleton-report__share" :icon="Share" :label="t('share.open')" disabled no-tooltip />
      </template>
    </UiPageBar>
    <div class="skeleton-report__cards">
      <div v-for="card in 2" :key="card" class="tile">
        <UiSkeleton class="line line--label" width="30%" />
        <UiSkeleton class="line line--h2" width="60%" />
        <UiSkeleton height="var(--chart-h)" radius="var(--radius-well)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-report__cards {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  padding-top: var(--space-4);
}

.skeleton-report .line {
  height: 1lh;
}

.line--label {
  font: var(--text-label);
}

.line--h2 {
  font: var(--text-h2);
}

.skeleton-report__share {
  visibility: hidden;
}

@media (min-width: 901px) {
  .skeleton-report__cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-top: var(--space-6);
  }
}
</style>
