<script setup lang="ts">
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
  <main class="legal">
    <UiPageContainer size="narrow">
      <NuxtLink class="legal__back" to="/"><BrandMark />TG Analyzer</NuxtLink>
      <p class="t-label legal__kicker">{{ t('terms.kicker') }}</p>
      <h1 class="t-h1">{{ t('terms.title') }}</h1>
      <p class="legal__updated">{{ t('terms.updated') }}</p>
      <p class="legal__draft" role="note">{{ t('terms.draft') }}</p>

      <div class="legal__card">
        <section v-for="(section, index) in sections" :key="section.key" class="legal__section">
          <h2 class="legal__title">
            <span class="legal__index t-num">{{ String(index + 1).padStart(2, '0') }}</span>
            {{ section.title }}
          </h2>
          <p>{{ section.text }}</p>
        </section>
      </div>
    </UiPageContainer>
  </main>
</template>

<style scoped>
.legal {
  min-height: 100dvh;
  padding-block: clamp(24px, 6vw, 80px);
}

.legal__back {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--space-10);
  font: 600 16px/1 var(--font-sans);
  letter-spacing: -0.02em;
}

.legal__kicker {
  margin-bottom: var(--space-2);
  color: var(--text-muted);
}

.legal__updated {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

/* The draft warning is a butter note, so it reads as temporary. */
.legal__draft {
  margin-block: var(--space-6) var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--butter);
  color: var(--on-lime);
  font: var(--text-small);
}

.legal__card {
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--surface);
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
  font: 600 18px/26px var(--font-sans);
  letter-spacing: -0.01em;
}

.legal__index {
  color: var(--text-faint);
  font: 500 13px/1 var(--font-mono);
}

.legal__section p {
  max-width: 68ch;
  color: var(--text-muted);
  font: 400 15px/24px var(--font-sans);
}

@media (max-width: 640px) {
  .legal__card {
    padding: var(--space-1) var(--space-5);
  }
}
</style>
