<script setup lang="ts">
import { buildExampleReport } from '../lib/example-report'
import { Info } from '../lib/icons'

const { t } = useI18n()
useSeoMeta({
  title: () => t('example.title'),
  description: () => t('example.description'),
  ogTitle: () => t('example.title'),
  ogDescription: () => t('example.description'),
})

// Rebuilt when the language changes, so the partner's name matches it.
const data = computed(() => buildExampleReport(t('example.partner')))
const storyOpen = ref(false)
</script>

<template>
  <UiPageContainer>
    <div class="page">
      <div class="example-intro">
        <p class="note" role="note">
          <Info aria-hidden="true" />
          {{ t('example.note') }}
        </p>
        <UiButton class="example-start" variant="primary" to="/login">{{ t('example.cta') }}</UiButton>
      </div>

      <ReportHeader :summary="data.summary" demo @story="storyOpen = true" />

      <PrivateReport :data="data" />

      <section class="tile example-end" aria-labelledby="example-end-title">
        <h2 id="example-end-title" class="t-h2">{{ t('example.endTitle') }}</h2>
        <p class="t-lede">{{ t('example.endText') }}</p>
        <UiButton variant="primary" size="lg" to="/login">{{ t('example.cta') }}</UiButton>
      </section>
    </div>

    <ReportStory :open="storyOpen" :data="data" offline @close="storyOpen = false" />
  </UiPageContainer>
</template>

<style scoped>
.example-intro {
  display: grid;
  gap: var(--space-3);
}
.example-start {
  display: none;
}

.example-end {
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-8);
}

.example-end .btn {
  margin-top: var(--space-2);
}

@media (max-width: 640px) {
  .example-start {
    display: inline-flex;
  }
  .example-end {
    padding: var(--space-5);
  }

  .example-end .btn {
    align-self: stretch;
  }
}
</style>
