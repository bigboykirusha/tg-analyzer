<script setup lang="ts">
import { Share } from '../../lib/icons'

/**
 * The shape of a report while it loads, under the poster's own loading shape: the first chapter's
 * title, its first finding on the room and two tiles — each line at the exact height of the text it
 * stands for (`1lh` in that text's font), so nothing moves when the report arrives. The bar is the
 * report's bar from the first frame.
 */
defineProps<{ title?: string | null }>()
const { t } = useI18n()
</script>

<template>
  <div class="skeleton-report" aria-hidden="true">
    <UiPageBar :title="title ?? ''" back="/dashboard" bar>
      <template #actions>
        <UiIconButton
          class="skeleton-report__share"
          tone="chrome"
          :icon="Share"
          :label="t('share.open')"
          disabled
          no-tooltip
        />
      </template>
    </UiPageBar>
    <div class="skeleton-report__head">
      <UiSkeleton class="line line--h1" width="40%" />
      <UiSkeleton class="line line--small" width="70%" />
    </div>
    <div class="skeleton-report__hero">
      <UiSkeleton class="line line--small" width="30%" />
      <UiSkeleton class="line line--h2" width="55%" />
      <UiSkeleton class="line line--figure" width="100%" />
      <UiSkeleton height="var(--bar-height-lg)" radius="var(--radius-full)" />
    </div>
    <div class="skeleton-report__tiles">
      <div v-for="tile in 2" :key="tile" class="tile">
        <UiSkeleton class="line line--small" width="45%" />
        <UiSkeleton class="line line--h3" width="75%" />
        <UiSkeleton class="line line--num" width="100%" />
        <UiSkeleton class="line line--small" width="60%" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-4);
}

.skeleton-report__head,
.skeleton-report__hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-report__head {
  gap: var(--space-1);
}

.skeleton-report__tiles {
  display: grid;
  gap: var(--card-gap);
}

/* A line of text is as tall as its line: the font of the role, one `lh`. */
.skeleton-report .line {
  height: 1lh;
}

.line--h1 {
  font: var(--text-h1);
}

.line--h2 {
  font: var(--text-h2);
}

.line--h3 {
  font: var(--text-h3);
}

.line--figure {
  font: var(--text-figure);
}

.line--num {
  font: var(--text-num);
}

.line--small {
  font: var(--text-small);
}

@media (min-width: 901px) {
  .skeleton-report__share {
    display: none;
  }

  .skeleton-report {
    padding-top: var(--space-6);
  }

  .skeleton-report__tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
