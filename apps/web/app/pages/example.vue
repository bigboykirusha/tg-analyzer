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
      </div>
    </UiPageContainer>
    <ReportEnding
      :data="data"
      :invite="{ title: t('example.endTitle'), text: t('example.endText'), cta: t('example.cta') }"
    />
  </div>
</template>

<style scoped>
.example-page {
  padding-top: var(--page-top);
}
</style>
