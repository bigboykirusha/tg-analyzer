<script setup lang="ts">
import { buildExampleReport } from '../lib/example-report'
import { ArrowLeft, Share2 } from '../lib/icons'

const { t, formatDay } = useI18n()
useSeoMeta({
  title: () => t('example.title'),
  description: () => t('example.description'),
  ogTitle: () => t('example.title'),
  ogDescription: () => t('example.description'),
})

// Rebuilt when the language changes, so the partner's name matches it.
const data = computed(() => buildExampleReport(t('example.partner')))
const storyOpen = ref(false)
const period = computed(() => {
  const { firstMessageAt, lastMessageAt } = data.value.summary
  if (!firstMessageAt || !lastMessageAt) return ''
  return `${formatDay(firstMessageAt.slice(0, 10))} – ${formatDay(lastMessageAt.slice(0, 10))}`
})
</script>

<template>
  <div class="example">
    <header class="example-bar">
      <UiPageContainer class="example-bar__inner">
        <NuxtLink to="/login" class="example-bar__brand" :aria-label="t('example.back')">
          <BrandMark :size="28" />
          <span>TG Analyzer</span>
        </NuxtLink>
        <div class="example-bar__actions">
          <UiLocaleSwitch />
          <UiThemeToggle />
          <UiButton variant="primary" size="sm" to="/login">{{ t('example.cta') }}</UiButton>
        </div>
      </UiPageContainer>
    </header>

    <UiPageContainer as="main">
      <div class="stack stack--lg report-page">
        <p class="example-note" role="note">
          <span class="t-label">{{ t('example.kicker') }}</span>
          <span>{{ t('example.note') }}</span>
        </p>

        <div class="example-head">
          <UiIconButton :icon="ArrowLeft" :label="t('example.back')" variant="ghost" to="/login" />
          <div class="example-head__copy">
            <h1 class="t-h1">{{ data.summary.title }}</h1>
            <p class="t-small t-muted">{{ period }}</p>
          </div>
          <UiButton variant="soft" size="sm" :icon="Share2" @click="storyOpen = true">{{ t('story.open') }}</UiButton>
        </div>

        <PrivateReport :data="data" />

        <section class="example-end" aria-labelledby="example-end-title">
          <h2 id="example-end-title" class="t-h2">{{ t('example.endTitle') }}</h2>
          <p>{{ t('example.endText') }}</p>
          <UiButton variant="primary" to="/login">{{ t('example.cta') }}</UiButton>
        </section>
      </div>
    </UiPageContainer>

    <ReportStory :open="storyOpen" :data="data" offline @close="storyOpen = false" />
  </div>
</template>

<style scoped>
.example {
  min-height: 100dvh;
  padding-bottom: var(--space-16);
}

.example-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.example-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: var(--topbar-height);
}

.example-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  border-radius: var(--radius-sm);
  font: 600 19px/24px var(--font-display);
  white-space: nowrap;
}

.example-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.example-note {
  display: grid;
  gap: var(--space-1);
  margin-top: var(--space-8);
  padding: var(--space-4) 0;
  border-block: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
}

.example-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.example-head__copy {
  display: grid;
  flex: 1;
  min-width: 0;
}

.example-end {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding-top: var(--space-8);
  border-top: 1px solid var(--border);
}

.example-end p {
  max-width: 56ch;
  color: var(--text-muted);
}

.report-page :deep(.report-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  min-width: 0;
}

@media (max-width: 900px) {
  .report-page :deep(.report-grid) {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .example-bar__actions :deep(.locale-switch),
  .example-bar__actions :deep(.theme-toggle) {
    display: none;
  }

  .example-bar__brand span {
    display: none;
  }

  .example-head {
    flex-wrap: wrap;
  }
}
</style>
