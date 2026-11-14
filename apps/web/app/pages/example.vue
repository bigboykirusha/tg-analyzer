<script setup lang="ts">
import { buildExampleReport } from '../lib/example-report'
import { hueOf } from '../lib/hue'

const { t, locale } = useI18n()
useSeoMeta({
  title: () => t('example.title'),
  description: () => t('example.description'),
  ogTitle: () => t('example.title'),
  ogDescription: () => t('example.description'),
})

// Rebuilt when the language changes, so the partner's name and the words of the chat match it.
const data = computed(() => buildExampleReport(t('example.partner'), locale.value))
// The example partner wears the same colour as on the landing.
useHead({ htmlAttrs: { 'data-hue': () => hueOf('example') } })
</script>

<template>
  <div>
    <ReportPoster :data="data" h1 />
    <UiPageContainer>
      <div class="page example-page">
        <PrivateReport :data="data" />

        <section class="tile example-invite">
          <h2 class="t-h2">{{ t('example.endTitle') }}</h2>
          <p class="t-body example-invite__text">{{ t('publicReport.endText') }}</p>
          <UiButton variant="primary" to="/login">{{ t('publicReport.cta') }}</UiButton>
        </section>
      </div>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.example-page {
  padding-top: var(--space-4);
}

.example-invite {
  align-items: flex-start;
}

.example-invite__text {
  color: var(--text-muted);
}
</style>
