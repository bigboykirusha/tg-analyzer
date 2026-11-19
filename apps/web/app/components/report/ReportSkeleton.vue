<script setup lang="ts">
import { Share } from '../../lib/icons'

/**
 * The shape of a report while it loads, under the poster's own loading shape: a panel with the lines of
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
    <div class="report-content skeleton-report__part">
      <UiSkeleton class="line line--h1" width="40%" />
      <ReportPanel wide-aside>
        <ReportSection>
          <UiSkeleton class="line line--label" width="30%" />
          <UiSkeleton class="line line--h2" width="48%" />
          <UiSkeleton height="var(--space-12)" radius="var(--radius-well)" />
        </ReportSection>
        <template #aside>
          <ReportSection>
            <UiSkeleton class="line line--label" width="35%" />
            <UiSkeleton class="line line--h2" width="60%" />
            <UiSkeleton height="var(--chart-h)" radius="var(--radius-well)" />
          </ReportSection>
        </template>
      </ReportPanel>
    </div>
  </div>
</template>

<style scoped>
/* The gaps of ReportPart: title, then cards. */
.skeleton-report__part {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

@media (min-width: 901px) {
  .skeleton-report__part {
    gap: var(--space-6);
  }
}

.skeleton-report .line {
  height: 1lh;
}

.line--label {
  font: var(--text-label);
}

.line--h1 {
  font: var(--text-h1);
}

.line--h2 {
  font: var(--text-h2);
}

.skeleton-report__share {
  visibility: hidden;
}
</style>
