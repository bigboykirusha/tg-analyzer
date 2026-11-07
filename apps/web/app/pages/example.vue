<script setup lang="ts">
import { buildExampleReport } from '../lib/example-report'
import { hueOf } from '../lib/hue'

const { t } = useI18n()
useSeoMeta({
  title: () => t('example.title'),
  description: () => t('example.description'),
  ogTitle: () => t('example.title'),
  ogDescription: () => t('example.description'),
})

// Rebuilt when the language changes, so the partner's name matches it.
const data = computed(() => buildExampleReport(t('example.partner')))
// The example partner wears the same colour as on the landing.
useHead({ htmlAttrs: { 'data-hue': () => hueOf('example') } })
</script>

<template>
  <div>
    <ReportPoster :data="data" />
    <UiPageContainer>
      <div class="page example-page">
        <ReportHeader :summary="data.summary" demo />

        <PrivateReport :data="data" />

        <section class="tile example-end" aria-labelledby="example-end-title">
          <h2 id="example-end-title" class="t-h2">{{ t('example.endTitle') }}</h2>
          <p class="t-lede">{{ t('example.endText') }}</p>
          <UiButton variant="primary" size="lg" to="/login">{{ t('example.cta') }}</UiButton>
        </section>
      </div>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.example-page {
  padding-top: var(--page-top);
}

.example-end {
  align-items: flex-start;
}

@media (max-width: 640px) {
  .example-end .btn {
    align-self: stretch;
  }
}
</style>
