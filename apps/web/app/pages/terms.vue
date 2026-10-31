<script setup lang="ts">
import { AlertTriangle } from '../lib/icons'

const { t } = useI18n()
useSeoMeta({
  title: () => t('terms.title'),
  description: () => t('terms.description'),
})

/** Each section: a title and paragraphs, all from the copy files. */
const sections = computed(() =>
  (['service', 'telegram', 'account', 'data', 'reports', 'limits', 'changes', 'contact'] as const).map((key) => ({
    key,
    title: t(`terms.${key}.title`),
    text: t(`terms.${key}.text`),
  })),
)
</script>

<template>
  <UiPageContainer size="narrow">
    <div class="page">
      <UiPageHeader :title="t('terms.title')" :lede="t('terms.updated')" />

      <div class="banner banner--warning" role="note">
        <AlertTriangle aria-hidden="true" />
        <p class="banner__text">{{ t('terms.draft') }}</p>
      </div>

      <div class="tile legal">
        <section v-for="(section, index) in sections" :key="section.key" class="legal__section">
          <h2 class="legal__title t-title">
            <span class="legal__index t-num">{{ index + 1 }}</span>
            {{ section.title }}
          </h2>
          <p>{{ section.text }}</p>
        </section>
      </div>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.legal {
  gap: 0;
  padding-block: var(--space-1);
}

.legal__section {
  display: grid;
  gap: var(--space-2);
  padding-block: var(--space-5);
}

.legal__section + .legal__section {
  border-top: 1px solid var(--border);
}

.legal__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.legal__index {
  min-width: 1.25em;
  color: var(--text-muted);
}

.legal__section p {
  max-width: 68ch;
  color: var(--text-muted);
  font: 400 15px/24px var(--font-sans);
}
</style>
