<script setup lang="ts">
import { buildExampleReport } from '../lib/example-report'

const { t } = useI18n()
useSeoMeta({
  title: () => t('example.title'),
  description: () => t('example.description'),
  ogTitle: () => t('example.title'),
  ogDescription: () => t('example.description'),
})

// Rebuilt when the language changes, so the partner's name matches it.
const data = computed(() => buildExampleReport(t('example.partner')))
</script>

<template>
  <UiPageContainer>
    <div class="page">
      <ReportHeader :summary="data.summary" demo />

      <PrivateReport :data="data" />

      <section class="tile example-end" aria-labelledby="example-end-title">
        <h2 id="example-end-title" class="t-h2">{{ t('example.endTitle') }}</h2>
        <p class="t-lede">{{ t('example.endText') }}</p>
        <UiButton variant="primary" size="lg" to="/login">{{ t('example.cta') }}</UiButton>
      </section>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.example-end {
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-8);
}

.example-end .btn {
  margin-top: var(--space-2);
}

@media (max-width: 640px) {
  .example-end {
    padding: var(--space-5);
  }

  .example-end .btn {
    align-self: stretch;
  }
}
</style>
